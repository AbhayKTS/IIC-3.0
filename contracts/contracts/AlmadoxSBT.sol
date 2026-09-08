// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AlmadoxSBT
 * @notice ERC-5192 Soulbound Token for Almadox verified campus identity.
 *
 * Each token represents a verified achievement (hackathon win, academic credential,
 * MicroGig proof-of-work, etc.) minted to a student's custodial Polygon wallet.
 *
 * Tokens are permanently locked to the recipient wallet and CANNOT be transferred,
 * sold, or burned — making them fraud-proof on-chain credentials.
 */

/// @dev ERC-5192 Minimal Soulbound NFT Interface
interface IERC5192 {
    /// @notice Emitted when token is permanently locked (on every mint)
    event Locked(uint256 tokenId);

    /// @notice Returns true if the token is locked (always true for SBTs)
    function locked(uint256 tokenId) external view returns (bool);
}

contract AlmadoxSBT is ERC721, Ownable, IERC5192 {
    // ─── State ────────────────────────────────────────────────────────────────
    uint256 private _nextTokenId;

    struct Achievement {
        string  title;       // e.g. "IIC 3.0 Finalist"
        string  issuedBy;    // e.g. "Manipal University Jaipur"
        string  reason;      // Citation / reason for the award
        uint256 mintedAt;    // Unix timestamp
        address recipient;   // Student wallet address
    }

    mapping(uint256 => Achievement) public achievements;

    // ─── Events ───────────────────────────────────────────────────────────────
    event SBTMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string  title,
        string  issuedBy
    );

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() ERC721("Almadox Soulbound Token", "ASBT") Ownable(msg.sender) {}

    // ─── Minting ──────────────────────────────────────────────────────────────

    /**
     * @notice Mint a Soulbound Token to a verified student wallet.
     * @dev Only callable by the contract owner (Almadox platform key).
     * @param to        Student's custodial wallet address
     * @param title     Achievement title
     * @param issuedBy  Issuing institution/authority
     * @param reason    Detailed citation
     */
    function mint(
        address to,
        string calldata title,
        string calldata issuedBy,
        string calldata reason
    ) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        achievements[tokenId] = Achievement({
            title:     title,
            issuedBy:  issuedBy,
            reason:    reason,
            mintedAt:  block.timestamp,
            recipient: to
        });

        emit Locked(tokenId);
        emit SBTMinted(tokenId, to, title, issuedBy);
    }

    // ─── ERC-5192 ─────────────────────────────────────────────────────────────

    /// @notice All tokens are permanently locked (non-transferable)
    function locked(uint256 /*tokenId*/) external pure override returns (bool) {
        return true;
    }

    // ─── Block all transfers ──────────────────────────────────────────────────

    /**
     * @dev Override ERC721 transfer mechanism to block all transfers.
     * Minting (from == address(0)) is still allowed.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "AlmadoxSBT: tokens are non-transferable");
        return super._update(to, tokenId, auth);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Get all token IDs owned by a given address
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        uint256 count = 0;
        for (uint256 i = 0; i < _nextTokenId && count < balance; i++) {
            if (_ownerOf(i) == owner) {
                tokenIds[count++] = i;
            }
        }
        return tokenIds;
    }

    /// @notice Total number of SBTs ever minted
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}

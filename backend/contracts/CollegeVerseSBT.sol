// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CollegeVerseSBT
 * @dev Non-transferable ERC-721 SoulBound Token for CollegeVerse
 * Once minted, tokens cannot be transferred — they are permanently bound to the recipient.
 */
contract CollegeVerseSBT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event SBTMinted(address indexed to, uint256 indexed tokenId, string reason);

    constructor() ERC721("CollegeVerse SBT", "CVSBT") Ownable(msg.sender) {}

    /**
     * @dev Mint a new SBT to a student wallet. Only owner (admin) can mint.
     * @param to The student's custodial wallet address
     * @param uri The token metadata URI (IPFS or JSON)
     * @param reason Human-readable reason for the SBT
     */
    function mint(address to, string memory uri, string memory reason) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit SBTMinted(to, tokenId, reason);
        return tokenId;
    }

    /**
     * @dev Returns the total number of SBTs minted
     */
    function totalMinted() public view returns (uint256) {
        return _nextTokenId;
    }

    // ========================
    // SOULBOUND: Block all transfers
    // ========================

    /**
     * @dev Override to prevent all transfers. SBTs are non-transferable.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)), block all other transfers
        if (from != address(0)) {
            revert("SBT: non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override approve to prevent approvals (no transfers possible)
     */
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("SBT: non-transferable");
    }

    /**
     * @dev Override setApprovalForAll to prevent approvals
     */
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("SBT: non-transferable");
    }

    // ========================
    // Required overrides for ERC721URIStorage
    // ========================

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

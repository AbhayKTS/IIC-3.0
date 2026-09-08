const mockCollege = {
  id: 'college_1',
  domain: 'example.edu',
  name: 'Example College',
  isActive: true,
};

const mockStudent = {
  uid: 'student_1',
  email: 'student@example.edu',
  role: 'student',
  verificationStatus: 'verified',
  collegeId: mockCollege.id,
};

const mockFaculty = {
  uid: 'faculty_1',
  email: 'faculty@example.edu',
  role: 'faculty',
  subRole: 'faculty',
  verificationStatus: 'verified',
  collegeId: mockCollege.id,
};

const mockRecruiter = {
  uid: 'recruiter_1',
  email: 'recruiter@company.com',
  role: 'recruiter',
  verificationStatus: 'verified',
  collegeId: mockCollege.id,
};

const mockAdmin = {
  uid: 'admin_1',
  email: 'admin@example.edu',
  role: 'faculty',
  subRole: 'adminFaculty',
  verificationStatus: 'verified',
  collegeId: mockCollege.id,
};

module.exports = {
  mockCollege,
  mockStudent,
  mockFaculty,
  mockRecruiter,
  mockAdmin,
};

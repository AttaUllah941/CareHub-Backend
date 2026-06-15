const asyncHandler = require('../../../core/utils/asyncHandler');
const { HttpStatus } = require('../../../shared/constants/httpStatus.constants');

class FamilyMemberController {
  constructor(familyMemberService) {
    this.familyMemberService = familyMemberService;
  }

  getFamilyMembers = asyncHandler(async (req, res) => {
    const result = await this.familyMemberService.getFamilyMembers(req.query, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: result });
  });

  getMyFamilyMembers = asyncHandler(async (req, res) => {
    const familyMembers = await this.familyMemberService.getMyFamilyMembers(req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { familyMembers } });
  });

  getByPatientId = asyncHandler(async (req, res) => {
    const familyMembers = await this.familyMemberService.getFamilyMembersByPatientId(
      req.params.patientProfileId,
      req.user,
    );
    res.status(HttpStatus.OK).json({ success: true, data: { familyMembers } });
  });

  getFamilyMemberById = asyncHandler(async (req, res) => {
    const familyMember = await this.familyMemberService.getFamilyMemberById(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, data: { familyMember } });
  });

  createFamilyMember = asyncHandler(async (req, res) => {
    const familyMember = await this.familyMemberService.createFamilyMember(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Family member created successfully',
      data: { familyMember },
    });
  });

  createMyFamilyMember = asyncHandler(async (req, res) => {
    const familyMember = await this.familyMemberService.createMyFamilyMember(req.body, req.user);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: 'Family member added successfully',
      data: { familyMember },
    });
  });

  updateFamilyMember = asyncHandler(async (req, res) => {
    const familyMember = await this.familyMemberService.updateFamilyMember(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Family member updated successfully',
      data: { familyMember },
    });
  });

  updateMyFamilyMember = asyncHandler(async (req, res) => {
    const familyMember = await this.familyMemberService.updateMyFamilyMember(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Family member updated successfully',
      data: { familyMember },
    });
  });

  deleteFamilyMember = asyncHandler(async (req, res) => {
    const result = await this.familyMemberService.deleteFamilyMember(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });

  deleteMyFamilyMember = asyncHandler(async (req, res) => {
    const result = await this.familyMemberService.deleteMyFamilyMember(req.params.id, req.user);
    res.status(HttpStatus.OK).json({ success: true, message: result.message });
  });
}

module.exports = FamilyMemberController;

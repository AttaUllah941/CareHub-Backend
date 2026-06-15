const FamilyRelationship = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  SPOUSE: 'SPOUSE',
  CHILD: 'CHILD',
};

const FAMILY_RELATIONSHIPS = Object.values(FamilyRelationship);

const UNIQUE_PER_PATIENT_RELATIONSHIPS = [
  FamilyRelationship.FATHER,
  FamilyRelationship.MOTHER,
  FamilyRelationship.SPOUSE,
];

module.exports = {
  FamilyRelationship,
  FAMILY_RELATIONSHIPS,
  UNIQUE_PER_PATIENT_RELATIONSHIPS,
};

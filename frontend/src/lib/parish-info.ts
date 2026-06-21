/**
 * Static parish identity used in the headers of printed official documents
 * (Pastoral Report, Monthly General Progress Report Sheet, Financial Report).
 *
 * These values are transcribed exactly from the physical Rivers Province 12
 * forms. Update here if the parish address, area, or pastor changes —
 * every printed document reads from this single source.
 */
export const PARISH_INFO = {
  parishName:    "Great Joy",
  areaName:      "Glory Chapel",
  province:      "Rivers Province 12",
  fullAddress:   "Great Joy Parish - Gloryland Estate Off Shell Pipeline Rumuduru Farm Road Rumuduru",
  pastorTitle:   "A/P",
  pastorSurname: "Olaegbe",
  pastorFirst:   "Rotimi O.",
  pastorFullName: "Olaegbe, Rotimi O.", // Surname first, as required on the form
  pastorPhone:   "08033302207",
  noteRecipients: [
    "1 Copy to the office of the General Overseer",
    "1 Copy to the office of the General Secretary",
    "1 Copy to the office of the Minister in charge",
  ],
};

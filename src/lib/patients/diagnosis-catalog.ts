// Standard maternal/obstetric diagnosis catalog, grouped by category —
// covers ICD-10 Chapter XV (pregnancy, childbirth and the puerperium)
// plus common comorbidities that complicate pregnancy. Selecting an entry
// in the Final Diagnosis step pre-fills the code/title fields, which stay
// editable — same "standard list + free entry" pattern as
// lab-test-catalog.ts.
export interface DiagnosisCatalogEntry {
  code: string;
  title: string;
}

export const DIAGNOSIS_CATEGORIES: { category: string; diagnoses: DiagnosisCatalogEntry[] }[] = [
  {
    category: "Hypertensive Disorders",
    diagnoses: [
      { code: "O13", title: "Gestational hypertension without significant proteinuria" },
      { code: "O14.0", title: "Mild to moderate pre-eclampsia" },
      { code: "O14.1", title: "Severe pre-eclampsia" },
      { code: "O14.9", title: "Pre-eclampsia, unspecified" },
      { code: "O15.0", title: "Eclampsia in pregnancy" },
      { code: "O15.1", title: "Eclampsia in labour" },
      { code: "O15.2", title: "Eclampsia in the puerperium" },
      { code: "O10", title: "Pre-existing (chronic) hypertension complicating pregnancy" },
      { code: "O11", title: "Pre-existing hypertension with superimposed proteinuria" },
    ],
  },
  {
    category: "Hemorrhagic Disorders",
    diagnoses: [
      { code: "O44", title: "Placenta praevia" },
      { code: "O45", title: "Premature separation of placenta (abruptio placentae)" },
      { code: "O46", title: "Antepartum haemorrhage, not elsewhere classified" },
      { code: "O67", title: "Labour and delivery complicated by intrapartum haemorrhage" },
      { code: "O72.0", title: "Third-stage haemorrhage" },
      { code: "O72.1", title: "Other immediate postpartum haemorrhage" },
      { code: "O72.2", title: "Delayed and secondary postpartum haemorrhage" },
      { code: "O72.3", title: "Postpartum coagulation defects" },
    ],
  },
  {
    category: "Infections & Sepsis",
    diagnoses: [
      { code: "O23", title: "Infections of genitourinary tract in pregnancy" },
      { code: "O41.1", title: "Infection of amniotic sac and membranes (chorioamnionitis)" },
      { code: "O85", title: "Puerperal sepsis" },
      { code: "O86", title: "Other puerperal infections" },
      { code: "O98.7", title: "HIV disease complicating pregnancy, childbirth and puerperium" },
      { code: "O98.6", title: "Malaria complicating pregnancy, childbirth and puerperium" },
    ],
  },
  {
    category: "Metabolic & Endocrine Disorders",
    diagnoses: [
      { code: "O24.4", title: "Gestational diabetes mellitus" },
      { code: "O24.0", title: "Pre-existing diabetes mellitus, type 1, in pregnancy" },
      { code: "O24.1", title: "Pre-existing diabetes mellitus, type 2, in pregnancy" },
      { code: "O99.0", title: "Anaemia complicating pregnancy, childbirth and the puerperium" },
      { code: "O99.2", title: "Endocrine, nutritional and metabolic diseases complicating pregnancy" },
    ],
  },
  {
    category: "Fetal, Placental & Amniotic Complications",
    diagnoses: [
      { code: "O36", title: "Maternal care for other known or suspected fetal problems" },
      { code: "O36.4", title: "Maternal care for intrauterine death" },
      { code: "O40", title: "Polyhydramnios" },
      { code: "O41.0", title: "Oligohydramnios" },
      { code: "O43", title: "Placental disorders" },
      { code: "O31", title: "Complications specific to multiple gestation" },
    ],
  },
  {
    category: "Labor & Delivery Complications",
    diagnoses: [
      { code: "O60", title: "Preterm labour" },
      { code: "O61", title: "Failed induction of labour" },
      { code: "O62", title: "Abnormalities of forces of labour" },
      { code: "O63", title: "Long labour" },
      { code: "O64", title: "Obstructed labour due to malposition/malpresentation" },
      { code: "O65", title: "Obstructed labour due to maternal pelvic abnormality" },
      { code: "O66", title: "Other obstructed labour (e.g. shoulder dystocia)" },
      { code: "O71", title: "Other obstetric trauma (e.g. uterine rupture)" },
      { code: "O82", title: "Delivery by caesarean section" },
    ],
  },
  {
    category: "Postpartum & Puerperium Complications",
    diagnoses: [
      { code: "O90.0", title: "Disruption of caesarean section wound" },
      { code: "O90.1", title: "Disruption of perineal obstetric wound" },
      { code: "O90.2", title: "Haematoma of obstetric wound" },
      { code: "O90.3", title: "Peripartum cardiomyopathy" },
      { code: "O90.4", title: "Postpartum acute renal failure" },
      { code: "O91", title: "Infections of breast associated with childbirth (mastitis)" },
      { code: "O99.3", title: "Mental disorders/diseases of nervous system complicating puerperium" },
    ],
  },
  {
    category: "Other Comorbidities Complicating Pregnancy",
    diagnoses: [
      { code: "B20", title: "HIV disease" },
      { code: "A51", title: "Early syphilis" },
      { code: "A54", title: "Gonococcal infection" },
      { code: "A56", title: "Chlamydial infection" },
      { code: "N39.0", title: "Urinary tract infection, site not specified" },
    ],
  },
];

export const ALL_DIAGNOSES: DiagnosisCatalogEntry[] = DIAGNOSIS_CATEGORIES.flatMap((c) => c.diagnoses);

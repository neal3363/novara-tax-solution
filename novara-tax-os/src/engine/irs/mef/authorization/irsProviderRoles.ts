/**
 * IRS Authorized e-file Provider roles for NOVARA Tax OS as an independent
 * software provider transmitting via Modernized e-File (MeF).
 *
 * An office's or preparer's EFIN does NOT authorize NOVARA (the software company)
 * to transmit as Software Developer / Transmitter.
 *
 * Official references (IRS.gov):
 * - Pub 3112 — https://www.irs.gov/pub/irs-pdf/p3112.pdf
 * - Pub 4164 — https://www.irs.gov/pub/irs-pdf/p4164.pdf
 * - Pub 1436 — https://www.irs.gov/pub/irs-pdf/p1436.pdf
 * - Pub 1345 — https://www.irs.gov/publications/p1345
 * - e-file Provider Services — https://www.irs.gov/tax-professionals/e-file-provider-services
 * - MeF ATS — https://www.irs.gov/e-file-providers/modernized-e-file-mef-assurance-testing-system-ats
 * - Software Developers fact sheet — https://www.irs.gov/e-file-providers/software-developers-technical-fact-sheet
 */

export type IrsProviderOption =
  | 'electronic_return_originator'
  | 'intermediate_service_provider'
  | 'software_developer'
  | 'transmitter'
  | 'online_provider'
  | 'reporting_agent'
  | 'large_taxpayer'

export interface OfficialIrsLink {
  id: string
  title: string
  url: string
  purpose: string
}

export const OFFICIAL_IRS_EFILE_LINKS: OfficialIrsLink[] = [
  {
    id: 'pub-3112',
    title: 'Publication 3112 — IRS e-File Application and Participation',
    url: 'https://www.irs.gov/pub/irs-pdf/p3112.pdf',
    purpose: 'Provider options, suitability, EFIN/ETIN assignment, participation rules',
  },
  {
    id: 'pub-4164',
    title: 'Publication 4164 — MeF Guide for Software Developers and Transmitters',
    url: 'https://www.irs.gov/pub/irs-pdf/p4164.pdf',
    purpose: 'A2A/IFA transmission, packaging, business rules, validation',
  },
  {
    id: 'pub-1436',
    title: 'Publication 1436 — ATS Guidelines (Individual MeF)',
    url: 'https://www.irs.gov/pub/irs-pdf/p1436.pdf',
    purpose: 'Individual ATS scenarios / Software Developer testing requirements',
  },
  {
    id: 'pub-5078',
    title: 'Publication 5078 — ATS Guidelines (Business MeF)',
    url: 'https://www.irs.gov/pub/irs-pdf/p5078.pdf',
    purpose: 'Business ATS when business e-file is offered',
  },
  {
    id: 'pub-4163',
    title: 'Publication 4163 — MeF Information for Business Returns',
    url: 'https://www.irs.gov/pub/irs-pdf/p4163.pdf',
    purpose: 'Business return e-file provider requirements',
  },
  {
    id: 'pub-1345',
    title: 'Publication 1345 — Authorized IRS e-file Providers (Individual)',
    url: 'https://www.irs.gov/publications/p1345',
    purpose: 'ERO / provider operating requirements for individual returns',
  },
  {
    id: 'pub-4557',
    title: 'Publication 4557 — Safeguarding Taxpayer Data',
    url: 'https://www.irs.gov/pub/irs-pdf/p4557.pdf',
    purpose: 'Legal requirements to safeguard taxpayer data',
  },
  {
    id: 'pub-5446',
    title: 'Publication 5446 — MeF Submission Composition Guide',
    url: 'https://www.irs.gov/e-file-providers/modernized-e-file-mef-user-guides-and-publications',
    purpose: 'Submission composition / packaging guidance (see MeF publications page)',
  },
  {
    id: 'efile-services',
    title: 'E-file Provider Services (e-Services application)',
    url: 'https://www.irs.gov/tax-professionals/e-file-provider-services',
    purpose: 'Access e-file Application, ATS questionnaires, IFA',
  },
  {
    id: 'mef-ats',
    title: 'MeF Assurance Testing System (ATS)',
    url: 'https://www.irs.gov/e-file-providers/modernized-e-file-mef-assurance-testing-system-ats',
    purpose: 'Official ATS open dates, scenarios, known issues',
  },
  {
    id: 'mef-pubs',
    title: 'MeF user guides and publications',
    url: 'https://www.irs.gov/e-file-providers/modernized-e-file-mef-user-guides-and-publications',
    purpose: 'Index of MeF schemas and publications',
  },
  {
    id: 'sw-dev-fact',
    title: 'Software Developers technical fact sheet',
    url: 'https://www.irs.gov/e-file-providers/software-developers-technical-fact-sheet',
    purpose: 'ETIN / Software ID / testing overview for developers',
  },
]

export interface NovaraProviderRolePlan {
  role: IrsProviderOption
  requiredForDirectMef: boolean
  rationale: string
  notes: string
}

/** Recommended provider options for NOVARA as independent tax software. */
export function recommendedNovaraProviderRoles(): NovaraProviderRolePlan[] {
  return [
    {
      role: 'software_developer',
      requiredForDirectMef: true,
      rationale:
        'NOVARA formats returns to IRS MeF XML schemas and must pass ATS as a Software Developer.',
      notes:
        'IRS assigns a Test ETIN for software testing that remains in Test status for year-round ATS.',
    },
    {
      role: 'transmitter',
      requiredForDirectMef: true,
      rationale:
        'NOVARA intends to send electronic return data directly to IRS MeF (not through another commercial tax platform).',
      notes:
        'Requires Production ETIN after communication testing; A2A systems need Application System IDs.',
    },
    {
      role: 'online_provider',
      requiredForDirectMef: false,
      rationale:
        'Secondary role if taxpayers self-prepare online through NOVARA. Must be paired with Software Developer and/or Transmitter.',
      notes: 'Online Provider EFINs use specific prefix codes per Pub 3112.',
    },
    {
      role: 'electronic_return_originator',
      requiredForDirectMef: false,
      rationale:
        'ERO is for originating client returns (typical TP/Office). Separate from NOVARA corporate Software Developer/Transmitter identity.',
      notes:
        'TP/Office EFINs do not substitute for NOVARA Software Developer/Transmitter authorization.',
    },
  ]
}

export interface OwnerEservicesChecklistItem {
  id: string
  step: string
  ownerAction: string
  officialLinkId: string
  blocksLiveTransmit: true
}

/** Ordered checklist the owner must complete in IRS e-Services. */
export function ownerEservicesApplicationChecklist(): OwnerEservicesChecklistItem[] {
  return [
    {
      id: 'login-gov',
      step: 'Create/verify Login.gov or ID.me identity for IRS e-Services',
      ownerAction: 'Owner (or designated Responsible Official) completes identity proofing',
      officialLinkId: 'efile-services',
      blocksLiveTransmit: true,
    },
    {
      id: 'efile-app',
      step: 'Start / update IRS e-file Application for the NOVARA legal entity',
      ownerAction: 'Apply as Software Developer + Transmitter (and Online Provider if applicable)',
      officialLinkId: 'pub-3112',
      blocksLiveTransmit: true,
    },
    {
      id: 'suitability',
      step: 'Complete suitability checks for Principals / Responsible Officials',
      ownerAction: 'Submit fingerprints / suitability items as IRS requires for selected roles',
      officialLinkId: 'pub-3112',
      blocksLiveTransmit: true,
    },
    {
      id: 'efin-etin',
      step: 'Receive IRS-assigned EFIN and ETIN(s)',
      ownerAction:
        'Record Software Developer Test ETIN vs Transmitter Production ETIN; never share raw secrets in git',
      officialLinkId: 'sw-dev-fact',
      blocksLiveTransmit: true,
    },
    {
      id: 'software-id',
      step: 'Obtain Software Identification Number(s) per tax year / product',
      ownerAction: 'Register software packages in e-file Application; complete ATS questionnaires',
      officialLinkId: 'mef-ats',
      blocksLiveTransmit: true,
    },
    {
      id: 'a2a',
      step: 'Register A2A client systems (Automated Enrollment) for MeF',
      ownerAction: 'Enroll Application System IDs before A2A transmissions',
      officialLinkId: 'pub-4164',
      blocksLiveTransmit: true,
    },
    {
      id: 'ats-individual',
      step: 'Complete Pub 1436 ATS scenarios for Form 1040 MeF',
      ownerAction: 'Authorize official ATS; record IRS acceptances (not mock ACKs)',
      officialLinkId: 'pub-1436',
      blocksLiveTransmit: true,
    },
    {
      id: 'comms-test',
      step: 'Complete Transmitter communication test for MeF',
      ownerAction: 'Move Forms Transmission Status to Production only after IRS updates status',
      officialLinkId: 'pub-5078',
      blocksLiveTransmit: true,
    },
    {
      id: 'safeguarding',
      step: 'Implement Pub 4557 safeguarding controls',
      ownerAction: 'Approve security program / independent AppSec before live returns',
      officialLinkId: 'pub-4557',
      blocksLiveTransmit: true,
    },
  ]
}

export function identifiersRequiredForNovaraModel(): {
  identifier: string
  required: boolean
  why: string
}[] {
  return [
    {
      identifier: 'EFIN (NOVARA entity)',
      required: true,
      why: 'IRS assigns EFINs to Authorized e-file Providers; NOVARA needs its own as Software Developer/Transmitter.',
    },
    {
      identifier: 'ETIN — Software Developer (Test)',
      required: true,
      why: 'Used exclusively for ATS / software testing; remains in Test status.',
    },
    {
      identifier: 'ETIN — Transmitter (Production)',
      required: true,
      why: 'Required to transmit live returns after communication testing and IRS status update.',
    },
    {
      identifier: 'Software ID (per tax year / product)',
      required: true,
      why: 'Assigned per software package; required for ATS questionnaires and production identification.',
    },
    {
      identifier: 'Application System ID (A2A)',
      required: true,
      why: 'Required if transmitting via Application-to-Application channel per Pub 4164.',
    },
    {
      identifier: 'Office / preparer EFIN',
      required: false,
      why: 'May be used by TP/Office EROs for client originations — does NOT authorize NOVARA corporate MeF transmission.',
    },
    {
      identifier: 'PTIN',
      required: false,
      why: 'Required for paid preparers signing as preparers; not a substitute for Transmitter ETIN.',
    },
  ]
}

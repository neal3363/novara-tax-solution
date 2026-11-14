/**
 * Deployment and release preparation checklist (Phase 12).
 * Separates public demo readiness from authorization to accept real taxpayers.
 */

export type ChecklistItemStatus = 'ready_staging' | 'documented' | 'missing' | 'blocked'

export interface DeploymentChecklistItem {
  id: string
  category: string
  title: string
  status: ChecklistItemStatus
  detail: string
}

export interface DeploymentPrepResult {
  items: DeploymentChecklistItem[]
  stagingDeployReady: boolean
  productionConfigReady: boolean
  publicDemoAllowedIfSynthetic: boolean
  acceptRealTaxpayers: false
  notes: string[]
}

export function buildDeploymentChecklist(): DeploymentPrepResult {
  const items: DeploymentChecklistItem[] = [
    {
      id: 'staging-deploy',
      category: 'Staging deployment',
      title: 'Staging environment deployable from this branch',
      status: 'ready_staging',
      detail: 'Vite build + isolated phase APIs; synthetic data only',
    },
    {
      id: 'prod-config',
      category: 'Production environment configuration',
      title: 'Production env config templates',
      status: 'documented',
      detail: 'Flags remain hard-OFF; production secrets/env not activated from Phase 12',
    },
    {
      id: 'domain-https',
      category: 'Domain and HTTPS',
      title: 'Domain + TLS termination',
      status: 'documented',
      detail: 'Must be configured on hosting provider before public demo of authenticated flows',
    },
    {
      id: 'secrets',
      category: 'Secure secrets management',
      title: 'Secrets manager / rotation',
      status: 'missing',
      detail: 'Production Stripe/MeF/KMS secrets not provisioned; sandbox only',
    },
    {
      id: 'monitoring',
      category: 'Monitoring and error reporting',
      title: 'APM / error tracking',
      status: 'documented',
      detail: 'Procedure required before production; not claimed operational',
    },
    {
      id: 'migrations',
      category: 'Database migration and rollback',
      title: 'Migration + rollback plans',
      status: 'documented',
      detail: 'Durable staging store exists; production DB migration plan required',
    },
    {
      id: 'backup-restore',
      category: 'Backup and restoration testing',
      title: 'Backup restore drill',
      status: 'missing',
      detail: 'Production restore drill not evidenced in this module',
    },
    {
      id: 'incident',
      category: 'Incident response',
      title: 'Incident response procedures',
      status: 'documented',
      detail: 'Checklist item present; runbooks must be staffed before launch',
    },
    {
      id: 'release-checklist',
      category: 'Release checklist',
      title: 'Human launch approval gate',
      status: 'ready_staging',
      detail: 'humanLaunchApprovalRequired=true; autoDeclareProductionReady=false',
    },
  ]

  const stagingDeployReady = items.some((i) => i.id === 'staging-deploy' && i.status === 'ready_staging')
  const productionConfigReady = false

  return {
    items,
    stagingDeployReady,
    productionConfigReady,
    publicDemoAllowedIfSynthetic: true,
    acceptRealTaxpayers: false,
    notes: [
      'Public demonstration may use synthetic data only — separate from production authorization.',
      'Do not accept real taxpayer information until launch gate is GO with human approval.',
    ],
  }
}

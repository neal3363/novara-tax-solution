import { AiPanel } from '../../components/AiPanel'
import '../shared.css'

export function TaxpayerAi() {
  return (
    <div className="page container">
      <header className="page-header">
        <div>
          <p className="eyebrow">Every user gets a personal AI assistant</p>
          <h1>Your Tax AI</h1>
        </div>
      </header>
      <AiPanel />
    </div>
  )
}

import { getFinancialInsights } from '@/app/actions/insights'
import { AssistantClient } from '@/components/assistant/AssistantClient'

export const dynamic = 'force-dynamic'

export default async function AssistantPage() {
  const insights = await getFinancialInsights()

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          ✨ Assistente IA
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Seu gerente financeiro pessoal, com acesso ao seu histórico completo em tempo real.
        </p>
      </div>
      <div className="flex-1">
        <AssistantClient insights={insights} />
      </div>
    </main>
  )
}

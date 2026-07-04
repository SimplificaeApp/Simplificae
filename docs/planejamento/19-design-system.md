# Design System & UI/UX

A experiência visual dita o tom "Premium" do FinanceOS. Queremos que os usuários sintam que estão utilizando uma plataforma de altíssimo padrão.

## Fundamentos Visuais
- **Dark Mode Nativo**: O tema base do produto é escuro. Cores de fundo variam do Zinco 950 (`#09090b`) para superfícies, com bordas muito sutis (10% de opacidade branca).
- **Glassmorphism**: Painéis flutuantes (como os cards do Dashboard) possuem fundo semi-transparente e "backdrop-blur" forte, dando profundidade ao layout.
- **Micro-animações**: Utilização de `Framer Motion` para transições de tela suaves e feedback tátil/visual imediato em botões e modais.

## Paleta de Cores
- **Brand**: Indigo/Violeta (Gradientes para destacar botões principais de ação).
- **Sucesso (Income)**: Emerald (`#10b981`) limpo e brilhante.
- **Alerta (Despesas / Dívidas)**: Rose (`#f43f5e`).
- **Aviso**: Amber (`#f59e0b`).

## Tipografia
- Fonte baseada em grotescas modernas (Geist Sans, Inter ou Outfit) garantindo legibilidade extrema para números (uso de `tabular-nums` para alinhar os centavos verticalmente nas tabelas).

## Componentes (Tailwind v4)
- Todo o design será codificado aproveitando os utilitários do Tailwind v4 (`@theme`), eliminando CSS extra e mantendo uma consistência em escala.

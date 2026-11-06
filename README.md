# Hub TV Treino & Alongamento (Kiosk TV)

Aplicativo web em modo Kiosk (100vw x 100vh, Dark Theme, Zero Digitação) desenvolvido em **Next.js 15 (App Router)** e **Tailwind CSS**, otimizado especificamente para **Smart TVs Samsung (Tizen)** com navegação nativa por controle remoto (D-Pad `◀ ▶ ▲ ▼` e `OK`).

Hospedado localmente no servidor **Umbrel** (`umbrel.local:8083` / `192.168.31.204:8083`).

---

## 🚀 Funcionalidades

### 1. Rotina Diária de Calistenia (Circuito Submáximo Full Body)
- **Piloto Automático:** 1 item na tela por vez, sem sobrecarga de decisão.
- **Estrutura:** Aquecimento (2 min: rotação de ombros, cat-cow, dead hang) + 4 exercícios em 2 voltas (rounds):
  1. Barra Fixa Supinada (Chin-up)
  2. Flexão no Chão (Push-up)
  3. Afundo Fixo (Split Squat por perna)
  4. Prancha Abdominal (Plank - cronometrada)
- **Cronômetros Contínuos:** Timer de execução e 45s de descanso automático entre cada exercício.
- **Escada de 6 Sessões:** 6 sessões concluídas por ciclo antes da subida automática de nível (`Ciclo 1` a `Ciclo 6`).
- **Modo Maestria Infinito:** A partir do `Ciclo 7+`, o sistema adiciona progressivamente repetições e tempo sob tensão.
- **Ajuste Manual de Conforto:** Modal de calibração para avançar ou recuar ciclos e sessões a qualquer momento.

### 2. Cards de Alongamento & Mobilidade
- **Alongamento RPG (Coluna e Postura):** Vídeo guiado do Dr. Rodrigo Lopes (15 min) em tela cheia na TV.
- **Alongamento Geral (15 min vs 30 min):** Seletor com rotina rápida diária (15 min) e rotina completa para iniciantes (30 min).

### 3. Métricas e Persistência Blindada
- Registro de cada treino, série, repetição acumulada e alongamento.
- Armazenamento em JSON permanente no Umbrel (`storage/workout-state.json`), imune a novos deploys.

### 4. Otimização para TV (Hardware Acceleration)
- Sem filtros pesados de desfoque (`backdrop-filter: blur`), sem `transform: scale` no foco e sem sombras gaussianas.
- Navegação fluida a 60 FPS no processador ARM do Tizen.

---

## 🛠️ Tecnologias
- **Next.js 15 (Standalone Output)**
- **React 19 / TypeScript**
- **Tailwind CSS**
- **Lucide React**
- **Web Audio API** (feedbacks sonoros para timers e conclusão)

---

## 📦 Deploy no Servidor Umbrel

O projeto conta com script de deploy automático em PowerShell que compila o bundle standalone e envia via SSH/tar sem sobrescrever os dados de progresso:

```powershell
.\scripts\deploy-umbrel.ps1
```

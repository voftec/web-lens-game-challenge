# Knowledge protocol

- `shared.md`: memoria compartida, append-only, entradas fechadas por agente.
- `agents/<agente>.md`: memoria privada por tipo de subagente; la crea cada agente
  en su primera corrida.
- Nada de ediciones destructivas — solo append.

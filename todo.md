# TODO - Correções CI/CD FLASHCARD

## Problemas Identificados

- [x] Atualizar actions/upload-artifact de v3 para v4 nos workflows
- [x] Atualizar actions/download-artifact de v3 para v4 nos workflows
- [x] Corrigir erros ESLint "no-undef" para funções não definidas (updateChartPeriod, updateAccuracyChart, updateProgressChart, etc.)
- [ ] Limpar variáveis não utilizadas (no-unused-vars) - em progresso
- [x] Corrigir configuração base no vite.config.js para GitHub Pages
- [ ] Testar build local antes do push
- [ ] Fazer commit e push das correções

## Ordem de Trabalho

1. ✅ Corrigir workflows YAML (artifact v4)
2. ✅ Implementar/remover funções fantasma
3. ✅ Ajustar vite.config.js
4. 🔄 Corrigir variáveis não utilizadas
5. Testar localmente
6. Push das correções

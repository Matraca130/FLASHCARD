# Guidelines for AI Agents

## Main JavaScript File
- `app-functional.js` is the only JavaScript file that should be modified. It contains the complete application logic and is referenced in `index.html`.
- Do **not** create new JavaScript files or rename the existing one.

## Workflow
1. Make small, incremental changes to `app-functional.js`.
2. Run local checks after each change:
   - `node scripts/enhanced_agent1_coordinator_fixed.cjs verifyStandards`
   - `npm test`
   - `pytest -q`
3. Commit with descriptive messages once tests are executed.
4. Push changes to the repository.

## Project Structure
- Maintain the current HTML, CSS, and backend structure.
- Keep deployment configuration intact.

These rules help ensure consistency when future AI agents update the StudyingFlash application.

## Additional Documentation
- Before editing, read `README_PARA_AGENTES.md` for project structure and workflow details.
- Follow the naming conventions described in `AGENT_CODING_STANDARDS.md`.
- If there is any discrepancy, the instructions in this file take precedence.

import { login, logout } from './auth.service.js';
import { startStudySession, submitAnswer } from './study.service.js';
import { createDeck } from './create.service.js';
import { deleteDeck } from './manage.service.js';

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case 'login': {
      const form = document.getElementById('login-form');
      if (!form) return;
      const email = form.querySelector('input[name="email"]').value;
      const password = form.querySelector('input[name="password"]').value;
      await login(email, password);
      break;
    }
    case 'logout':
      await logout();
      break;
    case 'create-deck': {
      const name = document.getElementById('deck-name').value.trim();
      const description = document.getElementById('deck-description').value.trim();
      const isPublic = document.getElementById('deck-public').checked;
      await createDeck({ name, description, isPublic });
      break;
    }
    case 'create-flashcard': {
      await createFlashcard();
      break;
    }
    case 'start-study':
      await startStudySession(el.dataset.id);
      break;
    case 'submit-answer':
      await submitAnswer(el.dataset.correct === 'true');
      break;
    case 'delete-deck':
      await deleteDeck(el.dataset.id);
      break;
  }
});

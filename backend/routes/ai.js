const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI Assistant endpoint is active',
    route: '/api/ai/study-advice'
  });
});

function buildFallbackAdvice(context, question) {
  const goal = context?.todayGoalMinutes || 0;
  const studied = context?.todayStudiedMinutes || 0;
  const progress = goal > 0 ? Math.round((studied / goal) * 100) : 0;
  const remaining = Math.max(goal - studied, 0);
  const completedTodos = context?.completedTodos || 0;
  const totalTodos = context?.totalTodos || 0;
  const pendingTodos = Math.max(totalTodos - completedTodos, 0);

  const subjectBreakdown = Array.isArray(context?.subjectBreakdown) ? context.subjectBreakdown : [];
  const mostDelayed = subjectBreakdown
    .map((s) => ({
      name: s.name,
      delay: Math.max((s.goalMinutes || 0) - (s.studiedMinutes || 0), 0)
    }))
    .sort((a, b) => b.delay - a.delay)[0];

  const advice = [];
  advice.push(`🎯 Progression du jour: ${studied}m / ${goal}m (${progress}%).`);

  if (goal === 0) {
    advice.push('Commence par planifier 2 sessions de 45 minutes pour lancer la journée.');
  } else if (progress < 40) {
    advice.push(`Tu es en retard de ${remaining} minutes. Priorise 2 blocs focus de 30-45 min sans interruption.`);
  } else if (progress < 80) {
    advice.push(`Il reste ${remaining} minutes pour atteindre ton objectif. Termine avec un bloc profond puis une révision courte.`);
  } else {
    advice.push('Excellent rythme. Consolide avec une session de révision active de 20-30 minutes.');
  }

  if (mostDelayed && mostDelayed.delay > 0) {
    advice.push(`Matière prioritaire maintenant: ${mostDelayed.name} (${mostDelayed.delay} min de retard).`);
  }

  if (totalTodos > 0) {
    advice.push(`Tâches: ${completedTodos}/${totalTodos} terminées. Il reste ${pendingTodos} tâche(s), traite d'abord les plus courtes.`);
  }

  if (question) {
    advice.push(`🧠 Réponse à ta question: ${question}`);
    advice.push('Plan proposé: 1) choisir la matière la plus en retard, 2) lancer 25 minutes focus, 3) faire un bilan rapide de 5 minutes.');
  }

  return advice.join('\n');
}

function buildPrompt(context, question, history) {
  const safeHistory = Array.isArray(history) ? history.slice(-6) : [];

  return `Tu es EduFocus AI Coach, expert en productivité étudiante.

Règles:
- Réponds en français.
- Ton professionnel, motivant, concret.
- Donne un diagnostic + plan actionnable en 4 à 8 puces.
- Utilise uniquement les données fournies, n'invente pas.
- Si retard, propose un plan de rattrapage réaliste.
- Termine par une mini question de coaching.

Contexte JSON:
${JSON.stringify(context, null, 2)}

Historique:
${JSON.stringify(safeHistory, null, 2)}

Question utilisateur:
${question || 'Donne-moi une analyse intelligente de ma journée et une stratégie claire pour atteindre mes objectifs.'}`;
}

router.post('/study-advice', async (req, res) => {
  try {
    const { context = {}, question = '', history = [] } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.json({
        success: true,
        source: 'fallback',
        advice: buildFallbackAdvice(context, question)
      });
    }

    const prompt = buildPrompt(context, question, history);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 700
          }
        })
      }
    );

    if (!response.ok) {
      const fallback = buildFallbackAdvice(context, question);
      return res.json({ success: true, source: 'fallback', advice: fallback });
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const advice = parts.map((part) => part?.text || '').join('\n').trim();

    if (!advice) {
      return res.json({
        success: true,
        source: 'fallback',
        advice: buildFallbackAdvice(context, question)
      });
    }

    return res.json({ success: true, source: 'gemini', advice });
  } catch (error) {
    return res.json({
      success: true,
      source: 'fallback',
      advice: buildFallbackAdvice(req.body?.context || {}, req.body?.question || '')
    });
  }
});

module.exports = router;

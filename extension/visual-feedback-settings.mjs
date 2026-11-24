import {feedbackSwitches} from '../src/aesthetic/visual-feedback.mjs';

export function mountVisualFeedbackSettings(parent, preference) {
  const section = document.createElement('section');
  section.className = 'visual-feedback-settings';
  section.innerHTML = `<h3>Visual Feedback</h3>
    ${Object.entries(feedbackSwitches).map(([key,label]) => `<label class="settings-row">${label}<input type="checkbox" name="${key}"></label>`).join('')}
    <fieldset><legend>Energy Projectile</legend>
      <label class="settings-row">Average speed <select name="speed"><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option></select></label>
      <label class="settings-row">Colors <select name="colors"><option value="random">Randomized colors</option><option value="theme">Match active theme</option></select></label>
    </fieldset><p role="status"></p>`;
  const controls = [...section.querySelectorAll('input,select')];
  const feedback = section.querySelector('[role=status]');
  function paint() {
    for (const control of controls) {
      const setting = preference.value[control.name];
      if (control.type === 'checkbox') control.checked = setting;
      else control.value = setting;
    }
  }
  for (const control of controls) control.onchange = async () => {
    const value = control.type === 'checkbox' ? control.checked : control.value;
    try {
      await preference.update(current => ({...current,[control.name]:value}));
      feedback.textContent = '';
    } catch {
      feedback.textContent = 'Visual feedback preference could not be saved.';
    }
    paint();
  };
  parent.append(section);
  paint();
  void preference.ready.then(paint);
}

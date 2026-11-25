import {feedbackSwitches} from '../src/aesthetic/visual-feedback.mjs';

export function mountVisualFeedbackSettings(parent, preference) {
  const section = document.createElement('section');
  section.className = 'visual-feedback-settings';
  section.innerHTML = `<h3>Visual Feedback</h3>
    ${Object.entries(feedbackSwitches).filter(([key])=>key!=='notifications').map(([key,label]) => `<label class="settings-row">${label}<input type="checkbox" name="${key}"></label>`).join('')}
    <fieldset><legend>Success Notifications</legend>
      <label class="settings-row">Show success notifications <select name="notifications"><option value="true">Yes</option><option value="false">No</option></select></label>
      <label class="settings-row">Show while Shelf is open <select name="notificationsWhileOpen" data-notification-option><option value="true">Yes</option><option value="false">No</option></select></label>
      <label class="settings-row">Dismiss on hover <select name="notificationHover" data-notification-option><option value="true">Yes</option><option value="false">No</option></select></label>
      <div class="settings-row"><label for="success-notice-position">Position</label><select id="success-notice-position" name="notificationPosition" data-notification-option><option value="center">Center</option><option value="bottom-right">Bottom-right</option></select></div>
      <div class="settings-row"><label for="success-notice-size">Size</label><select id="success-notice-size" name="notificationSize" data-notification-option><option value="small">Small</option><option value="standard">Standard</option><option value="large">Large</option></select></div>
    </fieldset>
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
      if(control.hasAttribute('data-notification-option'))control.disabled=!preference.value.notifications;
    }
  }
  for (const control of controls) control.onchange = async () => {
    const value = control.type === 'checkbox' ? control.checked :
      typeof preference.value[control.name]==='boolean' ? control.value==='true' : control.value;
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

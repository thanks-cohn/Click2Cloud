// Keep the initial aesthetic restore from briefly painting the wrong theme.
// Fail open so an unavailable storage service never blocks Remotes sign-in.
document.documentElement.dataset.aestheticPending='';
setTimeout(()=>{delete document.documentElement.dataset.aestheticPending;},500);

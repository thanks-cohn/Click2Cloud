from Xlib import X, XK, display
from Xlib.ext import xtest
import sys,time
client=display.Display()
root=client.screen().root
action=sys.argv[1]
def focus_window(index=-1):
    windows=[w for w in root.query_tree().children if w.get_wm_class() and 'chrom' in str(w.get_wm_class()).lower() and w.get_attributes().map_state==X.IsViewable and w.get_geometry().width>400]
    windows[index].configure(stack_mode=X.Above)
    windows[index].set_input_focus(X.RevertToParent, X.CurrentTime)
    client.sync()
if action=='focus':
    focus_window(int(sys.argv[2]) if len(sys.argv)>2 else -1)
elif action=='click':
    x,y=map(int,sys.argv[2:4])
    button=int(sys.argv[4]) if len(sys.argv)>4 else 1
    xtest.fake_input(client,X.MotionNotify,x=x,y=y)
    xtest.fake_input(client,X.ButtonPress,button)
    xtest.fake_input(client,X.ButtonRelease,button)
else:
    keys=[client.keysym_to_keycode(XK.string_to_keysym(k)) for k in sys.argv[2:]]
    for key in keys:xtest.fake_input(client,X.KeyPress,key)
    for key in reversed(keys):xtest.fake_input(client,X.KeyRelease,key)
client.sync()
time.sleep(.04)

'use strict';

const { St, Clutter, Gio, Shell } = imports.gi;
const Main = imports.ui.main;

class FocusedAppName {
    constructor() {
        this._box = null;
        this._icon = null;
        this._label = null;
        this._tracker = Shell.WindowTracker.get_default();
        this._signalId = null;
        this._titleSignalId = null; // Signal ID for tracking title changes
        this._currentWindow = null; // Reference to the currently focused window
    }

    enable() {
        if (!this._box) {
            this._box = new St.BoxLayout({
                vertical: false,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'focused-app-box'
            });
            this._box.spacing = 6;

            this._icon = new St.Icon({
                gicon: null,
                icon_size: 16,
                y_align: Clutter.ActorAlign.CENTER
            });
            this._label = new St.Label({
                text: '',
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'focused-app-name-label'
            });

            this._box.add_child(this._icon);
            this._box.add_child(this._label);
        }

        Main.panel._leftBox.insert_child_at_index(this._box, 0);

        this._signalId = global.display.connect(
            'notify::focus-window',
            () => this._onFocusWindowChanged()
        );

        this._onFocusWindowChanged(); // Initial update
    }

    disable() {
        if (this._signalId) {
            global.display.disconnect(this._signalId);
            this._signalId = null;
        }
        if (this._titleSignalId) {
            this._currentWindow.disconnect(this._titleSignalId);
            this._titleSignalId = null;
        }
        if (this._box) {
            this._box.destroy();
            this._box = null;
            this._icon = null;
            this._label = null;
        }
        this._currentWindow = null;
    }

    _onFocusWindowChanged() {
        let win = global.display.focus_window;

        // Disconnect the old title change signal if it exists
        if (this._titleSignalId && this._currentWindow) {
            this._currentWindow.disconnect(this._titleSignalId);
            this._titleSignalId = null;
        }

        if (win) {
            // Connect to the new window's title change signal
            this._currentWindow = win;
            this._titleSignalId = win.connect('notify::title', () => this._update());
        } else {
            this._currentWindow = null;
        }

        this._update();
    }

    _update() {
        let win = global.display.focus_window;
        if (win) {
            let app = this._tracker.get_window_app(win);
            let appName = app ? app.get_name() : 'Unknown';
            let windowTitle = win.get_title() || 'No Title';

            // Truncate the window title if it's too long
            const MAX_TITLE_LENGTH = 30;
            if (windowTitle.length > MAX_TITLE_LENGTH) {
                windowTitle = windowTitle.substring(0, MAX_TITLE_LENGTH) + '...';
            }

            // Combine app name and window title
            let displayText = ` ${appName} - ${windowTitle}`;
            this._label.set_text(displayText);

            // Update the icon
            if (app) {
                let appInfo = app.get_app_info();
                let gicon = appInfo ? appInfo.get_icon() : null;

                if (gicon) {
                    this._icon.gicon = gicon;
                    this._icon.visible = true;
                } else {
                    this._icon.gicon = null;
                    this._icon.visible = false;
                }
            } else {
                this._icon.gicon = null;
                this._icon.visible = false;
            }

            // Fade-in animation
            if (!this._box.visible) {
                this._box.opacity = 0;
                this._box.visible = true;
                Tweener.addTween(this._box, {
                    opacity: 255,
                    time: 0.2,
                    transition: 'easeInQuad'
                });
            }
        } else {
            // Fade-out animation
            if (this._box.visible) {
                Tweener.addTween(this._box, {
                    opacity: 0,
                    time: 0.2,
                    transition: 'easeOutQuad',
                    onComplete: () => {
                        this._box.visible = false;
                    }
                });
            }
        }
    }
}

function init() {
    return new FocusedAppName();
}

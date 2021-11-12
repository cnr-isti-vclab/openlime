import { Skin } from './Skin.js'

class UIDialog {
    constructor(container, options) {
        Object.assign(this, {
            dialog: null,
            content: null,
            container: container,
            modal: false,
            signals: {'closed':[] },
            class: null,
        }, options);
        this.create();
    }
    //TODO make QObject style events dependency
    addEvent(event, callback) {
		this.signals[event].push(callback);
	}
	emit(event, ...parameters) {
		for(let r of this.signals[event])
			r(...parameters);
	}

    create() {
        let background = document.createElement('div');
        background.classList.add('openlime-dialog-background');

        let dialog = document.createElement('div');
        dialog.classList.add('openlime-dialog');
        if(this.class)
            dialog.classList.add(this.classes);

        let close = Skin.appendIcon(dialog, '.openlime-close');
        close.classList.add('openlime-close');
        close.addEventListener('click', () =>this.hide());

        let content = document.createElement('div');
        content.classList.add('openlime-dialog-content');
        dialog.append(content);

        if(this.modal) {
            background.addEventListener('click', (e) => { if(e.target == background) this.hide(); });
            background.appendChild(dialog);
            this.container.appendChild(background);
            this.element = background;
            
        } else {

            this.container.appendChild(dialog);
            this.element = dialog;
        }
        
        this.dialog = dialog;
        this.content = content;
    }
    setContent(html) {
        if(typeof(html) == 'string')
            this.content.innerHTML = html;
        else
            this.content.replaceChildren(html);
    }
    show() {
        this.element.classList.remove('hidden');
    }
    hide() {
        this.element.classList.add('hidden');
        this.emit('closed');
    }
    toggle(on) {
        this.element.classList.toggle('hidden', on);
    }
}

export { UIDialog }

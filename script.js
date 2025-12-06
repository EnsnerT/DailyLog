/**
 * @version 1.4 (28.11.2025)
 * @author ensnerT (2025) https://github.com/EnsnerT
 * */
(function (ctx,doc){
    /* @formatter:off */
    function extendObject(b,e){return Object.defineProperties(b,Object.fromEntries(e.map(function(i){return Object.entries(Object.getOwnPropertyDescriptors(i));}).reduce(function(p,c){return(c.forEach(function(d){p.push(d);})),p;},[])));}
    /* define : (namespace, super, constructorFunction, prototype/classMethods, universal/staticMethods). */
    function defineClass(n,s,c,p,u){u=extendObject(u||{},[Object.fromEntries(Object.entries(s||{})),{'super':s}]);extendObject((n[c.name]=extendObject(c,[u||{}])).prototype,[p||{},s&&Object.fromEntries(Object.entries(s.prototype))||{},Object.defineProperty({},'static',{get:function(){return c;},set:function(v){}})])['super']=extendObject((s||function(){}),[s&&s.prototype||{}]);}
    function _element(type,props,childs){var e=doc.createElement(type);for(var key in props){e.setAttribute(key,props[key]);}for(var i in childs){e.appendChild(childs[i]);}return e;}
    function _text(content){return doc.createTextNode(content);}
    /* @formatter:on */

    var API = {};

    {
        API.i18n = {
            'de': {
                'watch.name.new': 'Neuer Name',
                'watch.name.save': 'Speichern',
                'watch.name.cancel': 'Abbrechen',
                'watch.delete.title': 'Löschen?',
                'watch.delete.confirm': 'Ja',
                'watch.delete.cancel': 'Nein',
                'watch.edit.title': 'ändern',
                'menu.button.add': 'Neu',
                'menu.button.removeAll': 'Alle Löschen'
            },
            'en': {
                'watch.name.new': 'New Name',
                'watch.name.save': 'Save',
                'watch.name.cancel': 'Cancel',
                'watch.delete.title': 'Delete?',
                'watch.delete.confirm': 'Yes',
                'watch.delete.cancel': 'No',
                'watch.edit.title': 'Edit',
                'menu.button.add': 'Add',
                'menu.button.removeAll': 'Remove All'
            }
        };
        API.lang = 'de';/*default lang*/
        function identity(e) {
            return e;
        }

        function lanugageValid(tag) {
            if (tag in API.i18n) return tag;
            let ltag = tag.split("-")[0];
            if (ltag in API.i18n) return ltag;
            return false;
        }

        if (typeof ctx.navigator !== 'undefined' && typeof ctx.navigator.languages !== 'undefined') {
            let validLangTags = new Array(ctx.navigator.languages).flatMap(identity).map(lanugageValid).filter(identity);
            if (validLangTags.length > 0) {
                API.lang = validLangTags[0];
            }
        }
        API.t = function (key) {
            return (API.i18n[API.lang]||{[key]:key})[key];
        }
    }

    API.sleep = async function sleep(timeout){
        if (timeout === undefined) timeout=1000;
        await new Promise(async function processor(res){
            setTimeout(res,timeout);
        });
    };

    API.getSubElementAndHideIfNotDefined = function getSubElementAndHideIfNotDefined(base,selector,attribute,value){
        var targetElement = base.querySelector(selector);
        if (targetElement !== undefined && value !== undefined) {
            targetElement.style.visibility = "inherit";
            targetElement[attribute] = value;
        } else if (targetElement !== undefined && value === undefined){
            targetElement.style.visibility = "hidden";
            targetElement[attribute] = "";
        }
        return targetElement;
    };

    API.Popup = async function Popup(title, default_value, ok_text, cancel_text){
        // Note: the popup does not create a new popup, but instead modifies one specific popup
        if (typeof doc !== "object"){
            throw new Error("document object not found");
        }
        var popupElement = doc.getElementById("popup");

        while(popupElement.style.visibility === "visible")await API.sleep(500);

        API.getSubElementAndHideIfNotDefined(popupElement,".title","innerText",title);
        var e_text = API.getSubElementAndHideIfNotDefined(popupElement,".text","value",default_value);
        var e_cancel = API.getSubElementAndHideIfNotDefined(popupElement,".cancel_button","value",cancel_text);
        var e_ok = API.getSubElementAndHideIfNotDefined(popupElement,".ok_button","value",ok_text);

        popupElement.style.visibility = "visible";
        if (default_value !== undefined){
            e_text.focus(); /* auto focus */
        } else {
            /* Fix: would not remove the focus from certain elements. could cause double calls */
            if(doc.activeElement){
                doc.activeElement.blur();
            }
        }

        var aborter = new AbortController();
        var click = await new Promise(function resolver(resolve){
            var resolveWith = function (returnValue){
                aborter.abort("finished");
                return resolve(returnValue);
            };
            var keyDownListener = (function keyListener(ok_enable, cancel_enable){
                return function (evt){
                    if (ok_enable && evt.keyCode === 13){
                        resolveWith({ target:e_ok });
                    }
                    if (cancel_enable && evt.keyCode === 27){
                        resolveWith({ target:e_cancel });
                    }
                };
            })(ok_text !== undefined, cancel_text !== undefined);
            e_ok.addEventListener('click',resolveWith,{'signal':aborter.signal});
            e_cancel.addEventListener('click',resolveWith,{'signal':aborter.signal});
            document.addEventListener('keydown',keyDownListener,{'signal':aborter.signal});
        });
        var value=undefined;
        console.log(click);
        if (click.target.classList.contains("ok_button")){
            if(default_value !== undefined){
                value=e_text.value;
            } else {
                value = true;
            }
        } else if (click.target.classList.contains("cancel_button")){
            if(default_value!==undefined){
                value = default_value;
            } else {
                value = false;
            }
        } else {
            console.warn("What did you click?");
        }
        popupElement.style.visibility = "hidden";
        return value;
    };

    defineClass(API, null, function Abortable(){this.aborter=new AbortController();},{signal:function(){return this.aborter.signal;},abort:function(){this.aborter.abort("stopped");}},{});

    /** [FIX] Safari : #5 */
    defineClass(API, null, function ContextMenuEvent(element, callback, signal){
        this.data.element = element;
        this.data.callback = callback;
        this.data.signal = signal;

        element.addEventListener('pointerdown',this.h_pointerDown.bind(this),{'signal':signal});
        element.addEventListener('pointermove',this.h_pointerMove.bind(this),{'signal':signal});
        element.addEventListener('pointerup',this.h_pointerUp.bind(this),{'signal':signal});
    },{
        detectActionTimerId:undefined,
        data:{x:undefined,y:undefined,pointerId:undefined},
        h_pointerDown:function(pointerEvent){
            if (this.data.pointerId !== undefined || this.data.pointerId !== pointerEvent.pointerId) {
                return true;
            }

            this.data.pointerId = pointerEvent.pointerId;
            this.data.x = pointerEvent.clientX;
            this.data.y = pointerEvent.clientY;
            if (this.detectActionTimerId)
                clearTimeout(this.detectActionTimerId);
            this.detectActionTimerId=setTimeout(this.trigger.bind(this,pointerEvent),1200);
        },
        h_pointerMove:function(pointerEvent){
            if (this.isWrongPointer(pointerEvent)){
                return true;
            }
            if (this.dist(pointerEvent) < 20){
                return true; /* all fine; no need to do anything */
            }
            if (this.detectActionTimerId !== undefined)
                clearTimeout(this.detectActionTimerId);
        },
        h_pointerUp:function(pointerEvent){
            if (this.isWrongPointer(pointerEvent)){
                return true;
            }
            this.data.pointerId = undefined; /* reset pointer */
            if (this.dist(pointerEvent) < 20)
                return true;
            if (this.detectActionTimerId !== undefined)
                clearTimeout(this.detectActionTimerId);
        },
        dist:function(pointerEvent){
            return Math.sqrt(Math.pow(pointerEvent.clientX-this.data.x,2) + Math.pow(pointerEvent.clientY-this.data.y,2));
        },
        isWrongPointer:function(pointer){
            return this.data.pointerId === undefined || this.data.pointerId !== pointer.pointerId;
        },
        trigger:function(startEvent){
            // this.data.element.dispatchEvent( new Event("contextmenu",{/* ..insert parameters if needed...*/}) );
            if (typeof this.data.callback === "function") {
                this.data.callback(startEvent);
            }
        }
    },{});

    defineClass(API, API.Abortable, function Watch(opts){
        this.super();
        if(opts instanceof Element){
            this.baseElement = opts;
            this.id = opts.querySelector("input[type=hidden]").value;
            this.mode = this.static.MODES.IDLE;
        } else if (typeof opts === 'object') {
            this.id=opts.id;
            this.start=opts.start;
            this.end=opts.end;
            this.mode=opts.mode;
            this.name=opts.name;
            this.baseElement=this.static.generateModel(opts);
        }
        this.baseElement.querySelector('.time').addEventListener('click',this.h_click.bind(this),{'signal':this.signal()});
        this.baseElement.querySelector('.time').addEventListener('contextmenu',this.h_reset.bind(this),{'signal':this.signal()});
        new API.ContextMenuEvent(this.baseElement.querySelector('.time'),this.h_reset.bind(this),this.signal());
        this.baseElement.querySelector('.rename').addEventListener('click',this.h_editName.bind(this),{'signal':this.signal()});
        this.update();
        this.display(true);
    },{
        baseElement:undefined,
        id:undefined,
        start:undefined,
        end:undefined,
        mode:undefined,
        name:'',
        'export':true,
        asSaveValue:function(){
            if(this['export']){
                return {
                    'name':this.name,
                    'start':this.start,
                    'end':this.end,
                    'mode':this.mode
                }
            }
            return undefined;
        },
        dispose:function(){
            if(this.isDisposable()){
                this.abort();
                this['export'] = false;
                this.baseElement.remove();
                return true;
            } else {
                return false;
            }
        },
        isDisposable:function(){
            return (this.mode === this.static.MODES.IDLE && this.start === undefined && this.end === undefined);
        },
        equals:function(other){
            return other===this.baseElement || other === this.id;
        },
        update:function(){
            this.baseElement.querySelector(".time").classList.value="time button-"+(this.mode===this.static.MODES.RUN?'run':'stop');
        },
        display:function(first){
            if(typeof first !== 'boolean') {
                first = false;
            }
            let zero = new Date('2000-01-01 00:00:00');
            zero=zero.getTime()-zero.getTimezoneOffset(); /* makes the display move along timezones */
            function ltrim(tx){tx=tx.toString();if(tx.length===1){return "0"+tx}else{return tx;}}
            let timeValue=undefined;
            if(this.mode===this.static.MODES.IDLE&&first){
                if(typeof this.start==='undefined' || this.start === 0){
                    timeValue="00:00:00";
                } else {
                    let calc=new Date(this.end-this.start+zero);/*move 'start' to 'zero' along with 'end'*/
                    timeValue=new Array(calc.getHours(),calc.getMinutes(),calc.getSeconds()).map(ltrim).join(":");
                }
            } else if (this.mode===this.static.MODES.RUN){
                let calc=new Date(Date.now()-this.start+zero);
                timeValue=new Array(calc.getHours(),calc.getMinutes(),calc.getSeconds()).map(ltrim).join(":");
            }
            if(typeof timeValue!=='undefined'){
                this.baseElement.querySelector(".time").innerText=timeValue;
            }
        },
        h_click:function(){
            if (this.mode === this.static.MODES.IDLE) {
                let time;
                if (typeof(this.end)==="undefined") {
                    time = Date.now();
                } else {
                    time = (Date.now() - (this.end - this.start + 0));
                }
                this.end=undefined;
                this.start=time;
                this.mode=this.static.MODES.RUN;
            } else {/*RUNNING*/
                this.end=Date.now();
                this.mode=this.static.MODES.IDLE;
            }
            this.update();
            ctx.Timer.save();
        },
        h_reset:function(e){
            try{e.preventDefault();}catch(ignore){}
            if(this.mode===this.static.MODES.IDLE){
                this.start=undefined;
                this.end=undefined;
            }
            this.update();
            this.display(true);
            ctx.Timer.save();
        },
        h_editName:function(){
            (async function (R){
                let name_old=R.name;
                let name_new=await API.Popup(API.t('watch.name.new'),R.name,API.t('watch.name.save'),API.t('watch.name.cancel'));
                if(name_new==''){ /*wants to delete*/
                    if(R.isDisposable()){
                        let delete_confirm=await API.Popup(API.t('watch.delete.title',name_old),undefined,API.t('watch.delete.confirm'),API.t('watch.delete.cancel'));
                        if(delete_confirm){
                            R.dispose();
                        }
                    }
                } else {/*wants to rename*/
                    if(name_new.match(/([+-]\d+)$/gm)!=null){
                        let spliter=Array.from(name_new.matchAll(/(.*)([+-]\d+)$/gm)); /* [<full>,<textonly>,<modifieronly>] */
                        name_new=spliter[0][1];
                        let timeDifference=parseInt(spliter[0][2]);
                        if(isNaN(timeDifference)){timeDifference=0;}
                        if(typeof(R.start)==='undefined'){
                            R.start=1;
                            R.end=(timeDifference*60000)+1;
                        } else {
                            R.start=R.start-(timeDifference*60000);
                        }
                        R.display(true);
                    }
                    R.name=name_new;
                    ctx.Timer.save();
                }
                R.baseElement.querySelector('.name').innerText=R.name;
            })(this);
        }
    },{
        MODES:{'IDLE':0,'RUN':1},
        generateModel:function(data){
            return _element('div', {'class': 'item'}, [
                _element('div', {}, [
                    _element('button', {'class': 'time'}, [_text('00:00:00')]),
                    _element('span', {'class': 'name'}, [_text(data.name)]),
                    _element('input', {'type': 'hidden', 'value': data.id}, []),
                    _element('button', {'class': 'rename'}, [_text(API.t('watch.edit.title'))]),
                ]),
                _element('span',{'class':'overlay'},[])
            ]);
        }
    });

    defineClass(API, API.Abortable, function Fix_Selection(){
        this.super();
        // if (this.static.isInstalled()){
        //     throw new Error("Can not install twice");
        // }
        this.static.active=true;
        doc.addEventListener("selectionchange",this.onSelectionChange_FixedRenameMove.bind(this),{'signal':this.signal()});
    },{
        /* [FIX] #8 */
        onSelectionChange_FixedRenameMove:function onSelectionChange_FixedRenameMove(_ignore){
            // step 1 : Did we even select a "raname" element
            let selection = ctx.getSelection();
            if (selection.type !== "Range" || selection.direction === "none")
                return true; // deselection

            const isSelectionBackwards = selection.direction === "backward";
            let names = Array.from(doc.querySelectorAll(".rename"));
            if (isSelectionBackwards){
                names.reverse();
            }
            while (names.length){
                if (selection.containsNode(names[0],true)){
                    break;
                }
                names.shift();
            }
            if ( !names.length ){
                return true; // all fine, no name elements are selected
            }
            // step 2 : Findout what part of the Text the user did select until the Interaction of the "name" element
            // note: i only expect 1 selection!
            const currentSelectionRange = selection.getRangeAt(0); // ranges are always forewards

            if (isSelectionBackwards){
                selection.setBaseAndExtent(currentSelectionRange.endContainer,currentSelectionRange.endOffset,currentSelectionRange.endContainer,0);
            } else {
                // currentSelectionRange.setEndAfter(currentSelectionRange.startContainer);
                selection.setBaseAndExtent(currentSelectionRange.startContainer,currentSelectionRange.startOffset,currentSelectionRange.startContainer,currentSelectionRange.startContainer.textContent.length);
            }
        },
        discard:function(){
            this.static.active=false;
            this.abort();
        }
    },{
        active:false,
        isInstalled:function(){return this.active;}
    });

    defineClass(API, API.Abortable, function Draggable(list, childSelector, targetSelector, handle){
        this.super();
        this.options={
            'list':list,
            'childSelector':childSelector,
            'targetSelector':targetSelector,
            'handle':handle,
            'minTravelDistance': 20,
            'edgeDist': 80
        };
        this.refreshHandlers();
    },{
        isDragging:false,
        /** @type {{active:boolean,aborter:{abort():void,signal():AbortSignal},childIndex:number,handle:{child:HTMLElement,targetHandle:HTMLElement},startingHandle:Array<{child:HTMLElement,targetHandle:HTMLElement}>,pos:{x:number,y:number},pointerId:number,iteration:{appliedMovers:Array<number>,childIndex:number}}} */
        draggingData:undefined,
        anyAborts:function(){
            return AbortSignal.any([this.baseSignal.signal(), this.signal()]);
        },
        refreshHandlers:function(){
            if (typeof this.baseSignal !== 'undefined'){
                this.baseSignal.abort();
            }
            this.baseSignal=new API.Abortable();
            this.getHandles().forEach(function(item){
                item.targetHandle.style.touchAction='none'; // todo - put this one in css
                item.targetHandle.addEventListener('pointerdown', this.handle_start.bind(this), {'signal':this.anyAborts(),'capture':true});
            },this);
        },
        getHandles:function(){
            return Array.from(this.options.list.querySelectorAll(this.options.childSelector)).map(function(item){
                return {'child':item,'targetHandle':item.querySelector(this.options.targetSelector)};
            },this);
        },
        /** @param {PointerEvent} pointerEvent */
        scrollStartEdge:function(pointerEvent){
            this.draggingData.scroller={
                vh:doc.scrollingElement.clientHeight,
                vw:doc.scrollingElement.clientWidth,
                sh:doc.scrollingElement.scrollHeight,
                sw:doc.scrollingElement.scrollWidth,
            };
        },
        /** @param {PointerEvent} pointerEvent */
        scrollAtEdge:function(pointerEvent){
            if (pointerEvent.pointerType === "mouse")
                return; // disables for mice. since they have scrollwheels
            // todo: approach 2: install a timer and move every 35ms by 20 units in the direction, until the pointer is not at the edge anymore
            let dist = this.options.edgeDist;
            let data = this.draggingData.scroller;
            if (data.sh > data.vh) {
                if (pointerEvent.clientY < dist){
                    // go up
                    doc.scrollingElement.scrollTop -= ((pointerEvent.clientY-dist) / -dist) * 20;
                } else if (pointerEvent.clientY > data.vh - dist){
                    // go down
                    doc.scrollingElement.scrollTop += ((pointerEvent.clientY - data.vh + dist) / dist) * 20;
                }
            }
        },
        /** @param {PointerEvent} pointerEvent */
        handle_start: function(pointerEvent){
            if(this.isDragging)
                return true;
            this.isDragging=true;
            // pointerEvent.preventDefault();
            let predicate = function(item){
                return pointerEvent.target.isSameNode(item.targetHandle);
            };
            let handles = this.getHandles();
            this.draggingData={
                aborter: new API.Abortable(),
                childIndex:handles.findIndex(predicate),
                handle:handles.filter(predicate)[0],
                startingHandle:handles,
                pos:{x:pointerEvent.screenX,y:pointerEvent.screenY},
                iteration:{appliedMovers:[]},
                pointerId: pointerEvent.pointerId,
                active:false
            };
            this.draggingData.childHeight=this.draggingData.handle.child.clientHeight;
            this.options.list.style.setProperty("--h", this.draggingData.childHeight+"px");
            this.options.list.style.setProperty("--dd-offset", "0px");
            // removeProperty

            this.options.list.addEventListener('pointermove',this.handle_move.bind(this),{'signal':this.draggingData.aborter.signal(),'capture':false});
            ctx.addEventListener('pointerup',this.handle_end.bind(this),{'signal':this.draggingData.aborter.signal()});
            if (pointerEvent.target.hasPointerCapture(pointerEvent.pointerId)) {
                pointerEvent.target.releasePointerCapture(pointerEvent.pointerId);
            }
            this.scrollStartEdge(pointerEvent);

            return false;
        },
        /** @param {PointerEvent} pointerEvent */
        handle_move: function(pointerEvent) {
            if (this.draggingData.pointerId !== pointerEvent.pointerId)
                return;

            let dist = Math.sqrt(Math.pow(pointerEvent.screenX-this.draggingData.pos.x,2) + Math.pow(pointerEvent.screenY-this.draggingData.pos.y,2));

            if (!this.draggingData.active){
                if(dist > this.options.minTravelDistance) {
                    this.options.list.classList.add("moving"); // will passivly disable the click event
                    this.draggingData.active = true;
                } else {
                    return;
                }
            }
            let predicate = function(item){
                return item.child.contains(pointerEvent.target);
            };

            let currentChildIndex = this.draggingData.startingHandle.findIndex(predicate);
            // if there is a child selected, or the childIndex EQUALS starting index
            if (currentChildIndex !== -1 || currentChildIndex === this.draggingData.childIndex){
                // store the current child index
                this.draggingData.iteration.childIndex = currentChildIndex;
            }
            if (currentChildIndex === -1)
            {
                currentChildIndex = this.draggingData.iteration.childIndex; // load from the previous round
            }

            let direction = 1;
            let startIndex = this.draggingData.childIndex;
            if (currentChildIndex < startIndex) {
                direction = -1;
            }
            // passive: if start == current => direction = 1

            this.scrollAtEdge(pointerEvent);

            let initialMovers = this.draggingData.iteration.appliedMovers;
            let finalMovers = [];
            {
                let lower=Math.min(startIndex,currentChildIndex);
                let upper=Math.max(startIndex,currentChildIndex);

                for (let i = lower, f=100; i <= upper && f>=0; i++ && f--){
                    finalMovers.push(i);
                    if(f <= 0) return; // something went wrong or you have a ton of
                }
            }

            if (finalMovers.length>0) {
                this.draggingData.handle.child.classList.add("passout");
            } else {
                this.draggingData.handle.child.classList.remove("passout");
                direction=0;
            }
            this.options.list.style.setProperty("--dd-offset", (this.draggingData.childHeight*-direction)+"px");

            let additiveMovers = finalMovers.filter(function(v){return !initialMovers.includes(v);});
            let removedMovers = initialMovers.filter(function(v){return !finalMovers.includes(v);});

            for (let v of removedMovers){
                if(this.draggingData.startingHandle[v])
                    this.draggingData.startingHandle[v].child.classList.remove("moved");
            }
            for (let v of additiveMovers)
            {
                if(this.draggingData.startingHandle[v])
                    this.draggingData.startingHandle[v].child.classList.add("moved");
            }

            this.draggingData.iteration.appliedMovers = finalMovers;
        },
        /** @param {PointerEvent} pointerEvent */
        handle_end: function(pointerEvent){
            // this.draggingData
            if (this.draggingData.pointerId !== pointerEvent.pointerId)
                return;

            this.draggingData.aborter.abort();
            // this.options.list.removeEventListener('pointermove',this.handle_move.bind(this));
            // this.options.list.removeEventListener('pointerup',this.handle_move.bind(this));

            this.options.list.classList.remove("moving");
            for (let index of this.draggingData.iteration.appliedMovers)
            {
                this.draggingData.startingHandle[index].child.classList.remove("moved");
            }
            this.draggingData.handle.child.classList.remove("passout");
            this.options.list.style.removeProperty("--h");
            this.options.list.style.removeProperty("--dd-offset");

            // this.isDragging=false;
            let startIndex = this.draggingData.childIndex;
            let endIndex = this.draggingData.iteration.childIndex;
            if (typeof endIndex !== 'undefined' && endIndex !== startIndex) {
                let kind = 'afterend';
                if (endIndex < startIndex) {
                    kind = 'beforebegin';// move before
                }
                this.draggingData.startingHandle[endIndex].child.insertAdjacentElement(kind,this.draggingData.handle.child);

                if (typeof this.options.handle === 'function')
                {
                    this.options.handle(startIndex, endIndex, endIndex < startIndex);
                }
            }

            this.isDragging=false;
        },
        /** @param {PointerEvent} pointerEvent */
        handle_cancel:function(pointerEvent){}
    },{

    });

    defineClass(API, API.Abortable, function Timers(){
        this.super();
        if("addEventListener" in ctx){
            let R=this;
            ctx.addEventListener("beforeunload",function(){R.save();},{'signal':this.signal()});
            doc.addEventListener("readystatechange",function(){
                R.load();
                R.draggable.refreshHandlers();
            },{'signal':this.signal()});
        }
        this.menu = doc.querySelector("div.menu");
        this.menu.children[0].remove();
        [
            ['menu.button.add',this.add.bind(this)]
            ,['menu.button.removeAll',this.removeAll.bind(this)]

        ].forEach(function(item){
            let element = _element('button', {},[_text(API.t(item[0]))]);
            element.addEventListener('click',item[1],{'signal':this.signal()});
            this.menu.append(element);
        },this);

        // page specific
        this.list = doc.querySelector(".list");
        this.updateId = setInterval(this.renderWatches.bind(this),500);
        new API.Fix_Selection(); // FIX #8
        this.draggable = new API.Draggable(this.list,'.item','.rename',(function(targetIndex, splitIndex){
            /* future improvement: tI is not needed twice */
            let tI=-1;
            // let count = 0;
            // let visibleTimers = [];
            // let removedTimers = [];
            // let movingTimer = undefined;
            // for (let v of this.timers){
            //     count++;
            //     if(v['export']||tI===targetIndex){tI++;}
            //     if(tI===targetIndex){
            //         movingTimer = v;
            //         continue;
            //     }
            //     if (v['export'])
            //         visibleTimers.push(v);
            //     else 
            //         removedTimers.push(v);
            // }
            let tempTimers = this.timers.filter(function(v){if(v['export']){tI++;}return v['export']&&tI!==targetIndex;});
            tI=-1;
            let item = this.timers.filter(function(v){if(v['export']){tI++;}return v['export']&&tI===targetIndex;})[0];
            let count = this.timers.length;
            for (let i = 0;i<count;i++){
                let current = this.timers.shift();
                if (!current['export'])
                    tempTimers.push(current);
            }
            for(let i = 0;i<count;i++){
                if(i === splitIndex){
                    this.timers.push(item);
                } else {
                    this.timers.push(tempTimers.shift());
                }
            }
            this.save();
        }).bind(this));
    },{
        loaded:false,
        timers:[],
        renderWatches:function(){
            this.timers.forEach(function(e){
                e.display(false);
            });
        },
        getNextUnique:function(){
            var next=0;
            if(this.timers.length){
                next = this.timers.reduce(function(p,c){
                    return Math.max(p,c.id);
                },0);
            }
            return next+1;
        },
        add:function(){
            var watch = new API.Watch({
                "name":"New timer",
                "start":undefined,
                "id": this.getNextUnique(),
                "mode":API.Watch.MODES.IDLE,
            });
            this.list.appendChild(watch.baseElement);
            this.timers.push(watch);
            this.save();
            this.draggable.refreshHandlers();
        },
        removeAll:async function(){
            if(await API.Popup(API.t('watch.delete.title'), undefined, API.t('watch.delete.confirm'), API.t('watch.delete.cancel'))){
                this.timers.forEach(function(watch){
                    watch.dispose();
                });
            }
            this.save();
            this.draggable.refreshHandlers();
        },
        destroy:function(){
            this.abort();
            clearInterval(this.updateId);
        },
        save:function(){
            localStorage.setItem(
                this.static.global_storage_key,
                JSON.stringify(
                    this.timers.map(
                        function(i){
                            return i.asSaveValue();
                        }
                    ).filter(function(i){
                        return typeof i!=='undefined';
                    })
                )
            );
            this.log('Data Saved');
        },
        load:function(){
            if(this.loaded){return;}
            this.loaded=true;
            this.log('Loading Data...');
            let data=JSON.parse(localStorage.getItem(this.static.global_storage_key)||'[]');
            if(typeof data!=='object'||data.length===0){return;}
            let R=this;
            data.forEach(function(i){
                let w=new API.Watch(extendObject(i,[{"id":R.getNextUnique()}]));
                R.timers.push(w);
                R.list.appendChild(w.baseElement);
            });
            this.log('Data Loaded');
        },
        log:function(v){
            console.info(v);
        }
    },{
        // #region Settings
        global_storage_key: "ch_thomas_timer",
        // #endregion Settings
    });

    extendObject(ctx, [{
        'Timer':new API.Timers(),
        'TimerApi':API
    }]);

})(typeof globalThis!=='undefined'?globalThis:window, document);

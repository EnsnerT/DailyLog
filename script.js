/**
 * @version 1.3 (11.11.2025)
 * @author ensnerT (2025) https://github.com/EnsnerT
 * */
(function (ctx){
    /* @formatter:off */
    function extendObject(b,e){return Object.defineProperties(b,Object.fromEntries(e.map(function(i){return Object.entries(Object.getOwnPropertyDescriptors(i));}).reduce(function(p,c){return(c.forEach(function(d){p.push(d);})),p;},[])));}
    /* define : (namespace, super, constructorFunction, prototype/classMethods, universal/staticMethods). */
    function defineClass(n,s,c,p,u){u=extendObject(u||{},[Object.fromEntries(Object.entries(s||{})),{'super':s}]);extendObject((n[c.name]=extendObject(c,[u||{}])).prototype,[p||{},s&&Object.fromEntries(Object.entries(s.prototype))||{},Object.defineProperty({},'static',{get:function(){return c;},set:function(v){}})])['super']=extendObject((s||function(){}),[s&&s.prototype||{}]);}
    function _element(type,props,childs){var e=ctx.document.createElement(type);for(var key in props){e.setAttribute(key,props[key]);}for(var i in childs){e.appendChild(childs[i]);}return e;}
    function _text(content){return ctx.document.createTextNode(content);}
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
                'menu.button.add': 'Add',
                'menu.button.removeAll': 'Remove All'
            }
        };
        API.lang = 'en';/*default lang*/
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
        ctx.document.documentElement.lang=API.lang;
        API.t = function (key) {
            return API.i18n[API.lang][key];
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
        if (typeof ctx["document"] !== "object"){
            throw new Error("document object not found");
        }
        var popupElement = ctx.document.getElementById("popup");

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
            if(ctx.document.activeElement){
                ctx.document.activeElement.blur();
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
        this.baseElement.querySelector('button.time').addEventListener('click',this.h_click.bind(this),{'signal':this.signal()});
        this.baseElement.querySelector('button.time').addEventListener('contextmenu',this.h_reset.bind(this),{'signal':this.signal()});
        this.baseElement.querySelector('button.rename').addEventListener('click',this.h_editName.bind(this),{'signal':this.signal()});
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
            this.baseElement.querySelector("button.time").classList.value="time button-"+(this.mode===this.static.MODES.RUN?'run':'stop');
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
                this.baseElement.querySelector("button").innerText=timeValue;
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
                            ctx.Timer.save();
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
                R.baseElement.querySelector('span').innerText=R.name;
            })(this);
        }
    },{
        MODES:{'IDLE':0,'RUN':1},
        generateModel:function(data){
            return _element('div',{},[
                _element('button',{'class':'time'},[_text('00:00:00')]),
                _element('span',{},[_text(data.name)]),
                _element('input',{'type':'hidden','value':data.id},[]),
                _element('button',{'class':'rename'},[_text('Edit')])
            ]);
            // return this.list.children.item(this.list.children.length-1);
        }
    });


    defineClass(API, API.Abortable, function Timers(){
        this.super();
        if("addEventListener" in ctx){
            let R=this;
            ctx.addEventListener("beforeunload",function(){R.save();},{'signal':this.signal()});
            ctx.document.addEventListener("readystatechange",function(){R.load();},{'signal':this.signal()});
        }
        this.menu = ctx.document.querySelector("div.menu");
        this.menu.querySelector('h3').remove();
        [
            ['menu.button.add',this.add.bind(this)]
            ,['menu.button.removeAll',this.removeAll.bind(this)]

        ].forEach(function(item){
            let element = _element('button', {},[_text(API.t(item[0]))]);
            element.addEventListener('click',item[1],{'signal':this.signal()});
            this.menu.append(element);
        },this);

        // page specific
        this.list = ctx.document.querySelector("div.list");
        this.updateId = setInterval(this.renderWatches.bind(this),500);
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
                "mode":API.Watch.MODES.IDLE
            });
            this.list.appendChild(watch.baseElement);
            this.timers.push(watch);
            this.save();
        },
        removeAll:async function(){
            if(await API.Popup(API.t('watch.delete.title'), undefined, API.t('watch.delete.confirm'), API.t('watch.delete.cancel'))){
                this.timers.forEach(function(watch){
                    watch.dispose();
                });
            }
            this.save();
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

    // ctx.onbeforeunload=function(){ctx.Timer.save();};
    // ctx.document.onreadystatechange=function(){ctx.Timer.load();}

})(typeof globalThis!=='undefined'?globalThis:window);

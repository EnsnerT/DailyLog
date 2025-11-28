/**
 * Service Worker <br/>
 * Note: This is not yet Installed. Its Idea is to make the Pages be Cached and work Offline. But it will only Cache, if the User enables a Setting (Future)
 * @author ensnerT (2025) https://github.com/EnsnerT
 * @version pre_1
 * @description ServiceWorker 
 * @file serviceWorker.js
 * @this ServiceWorkerGlobalScope
 */
/**
 * @typedef {{url:string,focus():void,focused:boolean,visibilityState:"hidden"|"visible"}} Client
 */
/**
 * handler.<eventName>=function(<event>){<eventHandler>}
 * @private
 */
let installDate = Date.now();
const CACHE_ID = "ensert_DailyLog_pages";
const BASE_URL = "https://ensnert.github.io/DailyLog/"; // todo - can be fetched from manifest file?
const CACHABLE_URL = [
    "", /* "/" */
    "serviceWorker.js",
    "script.js"
];
let temporary_offline = false;
function getCachableUrls(){
    return CACHABLE_URL.map(function(value){return BASE_URL+CACHABLE_URL;});
}

const handlers = {
    error:function(event){
        SW.error(event);
        if(SW.isActive()){
            // SW.unregister();
            console.error("[ServiceWorker Backup] Detected an Error. Try to Update on next Request. Error %o",event);
            // self.registration.unregister();
        }
    },
    install:function(event){
        // SW.log(event);
        // SW.log(SW.currentState());
        
        event.waitUntil(new Promise(async function(res,rej){
            // SW.log("STATE 0");
            await SW.SETTINGS.setByKey("installedDate",Date.now());
            // await SW.SETTINGS.setByKey("activationDate",installDate);
            
            SW.updatePrevious();
            res();
        }));
    },
    statechange:function(event){
        // this event does not existst
        if(event.state == "installed"){ // waiting
            if(SW.wasInstalled()){
                SW.log("Waiting to Update to new Service Worker");
            }
            SW.updatePrevious();
        }

        SW.log(event);
        // parsed, installing, installed, activating, activated, or redundant
    },
    /** @param {FetchEvent} */
    'fetch':function(event){
        if (!temporary_offline){
            event.respondWith(
                fetch(event.request).catch(function(error){
                    // by specification, if there is a network issue, the "error" is of type TypeError (https://fetch.spec.whatwg.org/#fetch-method)
                    if (error instanceof TypeError){
                        temporary_offline = true;
                        setTimeout(function(){
                            temporary_offline = false;
                        },2000); // stop these Request for 1 Second
                        return SW.respondFromCache(event.request);
                    }
                })
            );
        } else {
            event.respondWith(SW.respondFromCache(event.request));
        }
    },
    message:function(event){
        /* "update" will unregister it self and respond with "proceedInstalling" */
        if(event.data.startsWith("update")){
            // in old SW
            SW.unregister().then(function(){
                // send new SW, he can continue
                event.source.postMessage("proceedInstalling");
                // (self.registration?.waiting||self.registration.installing).postMessage("proceedInstalling");
            });
            return;
        }
        /* "proceedInstalling" will override the Waiting Process */
        if(event.data.startsWith("proceedInstalling")){
            // in new SW
            self.skipWaiting();
            return;
        }
        /* any {type:"call",name:"<method name>",...} will be a method call in messageAPI with callback to source */
        var data;
        try{
            /** @type {{type:string,name:string,args:any[]}} data */
            data = JSON.parse(event.data);
        }
        catch(e){}
        finally{
            // type = "call"
            if(data.type == "call"){
                let response = messageAPI[data.name]?.call(event,...data.args);
                if(messageAPI[data.name]===undefined){
                    response=new SyntaxError("Unsupported Method");
                }
                // SW.log(event.source);
                let answer = {
                    id: data.id,
                    type: "response",
                    response: response
                };
                event.source.postMessage(JSON.stringify(answer));
                return ;
            }
        }

    },
    activate:function(event){
        SW.log(event);
        SW.SETTINGS.setByKey("activatedDate",Date.now());
        self.clients.claim();
        // SW.getMostActiveInstance()
        //     .then(a=>a.filter(b=>b.url == "https://pepdemo.dcaweb.ch/fizAppWeb/swtest.html")[0].postMessage('{type:"requestUpdateSettings"}'));
    },
    
}
// https://developer.chrome.com/articles/periodic-background-sync/

// init events
for(let eventName in handlers){
    self.addEventListener(eventName,handlers[eventName]);
}

/**
 * serviceWorker.sendMessage("{type:'call',name:'<methodName>',args:[...]}")
 * @public
 * @this {ExtendableMessageEvent}
 */
const messageAPI = {
    update:function(a,b){
        SW.log(`i got called by ${this.source?.id||typeof this.source}`);
    },
    cache:function(installableStamp){
        SW.SETTINGS.getByKey("lastPageCacheStamp").then(function(installedStamp){
            if (installableStamp > installedStamp) {
                // cache is outdated!
                caches.open(CACHE_ID).then(function(cache){
                    return cache.addAll(getCachableUrls());
                });
                SW.SETTINGS.setByKey("lastPageCacheStamp", installableStamp);
            }
        });
    },
    // updateSettings:function(setting=null){
    //     SW.updateSettings(setting);
    // },
}
/**
 * @protected
 */
const SW = {
    SETTINGS:{
        /** 
         * @param {String|undefined} data
         * @return {boolean|String|number|undefined}
        */
        convertTypes:function(data){
            if (data == 'true'||data == 'false'){
                if(data == 'true'){
                    data = true;
                } else {
                    data = false;
                }
            }
            if(isFinite(data)){
                data = data-0;
            }
            return data;
        },
        /** @return {Promise<boolean|string|number|undefined>}*/
        getByKey:function(key){
            return new Promise(async function(res,rej){
                let storage = await self.caches.match(BASE_URL+"settings");
                let data = (await storage.json())[key];
                data = SW.SETTINGS.convertTypes(data)
                res(data);
            });
        },
        /** @return {Promise<void>}*/
        setByKey:function(key,value){
            return new Promise(async function(res,rej){
                let storage = await self.caches.open(CACHE_ID)
                let data = await (await storage.match(BASE_URL+"settings")).json();
                data[key] = value;
                await storage.put(BASE_URL+"settings",new Response(JSON.stringify(data),{"Content-Type":"application/json"}));
                res();
            });
        },
        /** @return {Promise<{[key:string]:boolean|string|number|undefined}>} */
        getAll:function(){
            return new Promise(async function(res,rej){
                let storage = await self.caches.match(BASE_URL+"settings");
                let data = await storage.json();
                let result = {};
                for(let [key,value] of Object.entries(data)){
                    result[key] = SW.SETTINGS.convertTypes(value);
                }
                res(result);
            });
        },
        /** 
         * @param {[key:string]:boolean|string|number} data 
         * @return {Promise<void>}
        */
        setAll:function(data){
            return new Promise(async function(res,rej){
                let storage = await self.caches.open(CACHE_ID);
                await storage.put(BASE_URL+"settings",new Response(JSON.stringify(data),{"Content-Type":"application/json"}));
                res();
            });
        }
    },
    /**
     * @param {Request} request
     * @return {Response} */
    respondFromCache:function(request){
        return caches.match(request).then(function(value){
            if (value){
                return value;// response
            } else {
                return "<html><body>Error Loading from Offline Cache: "+request.url?.replaceAll(/<|>/g,'')+"</body></html>";
            }
        }).catch(function(error){
            return "<html><body>Error Fetching Cache: "+request.url?.replaceAll(/<|>/g,'')+"</body></html>";
        });
    },
    /** @returns {Promise<Client[]>} */
    getMostActiveInstance:function(){
        let sortAlign = {"visible":1,"hidden":2};
        return self.clients.matchAll().then(function(e){
            return e
                .sort((a,b)=>sortAlign[a.visibilityState]-sortAlign[b.visibilityState])
                .sort((a,b)=>b.focused-a.focused);
        })
    },
    currentState:function(){
        return self.serviceWorker.state;
    },
    wasInstalled:function(){
        if(SW.isActive()){return undefined;}
        return self.registration?.active!=undefined;
    },
    isActive:function(){
        return this.currentState() == "activated";
    },
    log:function(...a){
        let first = a.shift();
        if(typeof first == 'object'){a.unshift(first);first='%o'}
        console.log(`%c[Service Worker]:%c ${first}`,'color:purple','color:revert',...a);
    },
    error:function(...a){
        let first = a.shift();
        if(typeof first == 'object'){a.unshift(first);first='%o'}
        console.error(`%c[Service Worker]:%c ${first}`,'color:purple','color:revert',...a);
    },
    updatePrevious:function(){
        self.registration?.active?.postMessage("update")||self.skipWaiting();
    },
    unregister:function(){
        SW.log(`Uninstalling active ServiceWorker`);
        return new Promise(function(rs,rj){
            // incase something takes too long, reject
            const backuptimer = setTimeout(rs,1000);
            (async function () {
                // start cleanup

                for(let eventName in handlers){
                    self.removeEventListener(eventName,handlers[eventName]);
                }
                // end cleanup

                clearTimeout(backuptimer);
                rs();
            })()
        });
    }
}


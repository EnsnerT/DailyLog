// #region Settings

const global_storage = "ch_thomas_timer";

// #endregion
let timers = [];
window.onbeforeunload = save;
document.onreadystatechange = load;

async function sleep(timeout = 1000) {
    let promise = new Promise(
        async (resolve) => 
        {
            setTimeout(
                () => {
                    resolve(true);
                },
                timeout
            );
        }
    );
    await promise;
}
/**
 * Shows a Custom Alert
 * Popup can not be twice open.
 * @param {string} title Title from the Alert
 * @param {string} def_val Default Value (Leave Empty for a 'ok'/'cancel' input)
 * @param {string} ok_name OK-button label (Leave Empty for no 'ok')
 * @param {string} cancel_name Cancel-button label (Leave Empty for no 'cancel')
*/
async function popup(title = null, def_val = null, ok_name = "Ok", cancel_name = null) {
    let popup = document.getElementById("popup");
    if (popup.style.visibility == "visible") // already in use
    {
        await new Promise(async (resolve) => 
            {
                while (popup.style.visibility == "visible") 
                {
                    await sleep(500);
                }
                resolve(true);
            }
        )
    }

    if (title != null) {
        popup.querySelector(".title").style.visibility = "inherit";
        popup.querySelector(".title").innerText = title;
    } else {
        popup.querySelector(".title").style.visibility = "hidden";
    }

    if (def_val != null) {
        popup.querySelector(".text").style.visibility = "inherit";
        popup.querySelector(".text").value = def_val;
    } else {
        popup.querySelector(".text").style.visibility = "hidden";
    }

    if (cancel_name != null) {
        popup.querySelector(".cancel_button").style.visibility = "inherit";
        popup.querySelector(".cancel_button").value = cancel_name;
    } else {
        popup.querySelector(".cancel_button").style.visibility = "hidden";
    }

    if (ok_name != null) {
        popup.querySelector(".ok_button").style.visibility = "inherit";
        popup.querySelector(".ok_button").value = ok_name;
    } else {
        popup.querySelector(".ok_button").style.visibility = "hidden";
    }

    popup.style.visibility = "visible";
    if (def_val != null){
        popup.querySelector(".text").focus() /* Fokusieren */
    }

    let click = await new Promise(
        (resolve) => {
            kd = function(ok, cancel) {
                return (e) => {
                    if (e.keyCode == 13 && ok) // enter = ok
                    {
                        a({ target: popup.querySelector(".ok_button") })
                    }
                    if (e.keyCode == 27 && cancel) // esc = cancel
                    {
                        a({ target: popup.querySelector(".cancel_button") })
                    }
                }
            } (
                ok_name != null,
                cancel_name != null
            )
            a = (R) => { 
                // console.log(R);
                popup.querySelector(".ok_button").removeEventListener('click',a);
                popup.querySelector(".cancel_button").removeEventListener('click', a);
                document.removeEventListener('keydown',kd);
                return resolve(R);
            }
            popup.querySelector(".ok_button").addEventListener('click', a);
            popup.querySelector(".cancel_button").addEventListener('click', a);
            document.addEventListener('keydown', kd);
            
        }
    );

    let value = undefined;
    if (click.target.classList.value == "ok_button") { // OK-clicked
        if (def_val != null) { // text was a option
            value = popup.querySelector(".text").value;
        } else 
        if (cancel_name != null) { // cancel was a option
            value = true;
        } else { // default
            value = true;
        }
    } else 
        if (click.target.classList.value == "cancel_button") { // Cancel-clicked
        if (def_val != null) { // text was a option
            value = def_val;
        } else
        if (ok_name != null) { // ok was a option
            value = false;
        } else { // default
            value = false;
        }
    } else {
        console.warn('what did you click?');
    }
    popup.style.visibility = "hidden";
    return value;
}
/*  
    Await makes the Promise wait, and then Returns directly the Value
    Await & Promise: [Promise]
        await new Promise( // new Promise (waits till 'resolve()' is called inside this promise)
            async (resolve, reject)=>
            {
                while(popup.style.visibility == "visible"){
                    await sleep(500); // waits 500 ms, then continues
                }
                resolve(); // continues at the Promise
            }
        )
    Value in a other function: [Closure Function]
        return function (R)
        {
            return function()
            {
                console.log(R) // 'value'
            }
        }
        ('value')
*/

async function test() {
    let a = await popup(
        "test-title", 
        "test-value", 
        "test-ok", 
        "test-cancel");
    console.log(`> Value is : %c'%s'`, 'color:red', a);

    a = await popup(
        "Löschen?",
        null,
        "Ja",
        "Nein");
    console.log(`> Value is : %c'%s'`, 'color:red', a);
}

function getNextUnique() {
    let next = 0;
    if (timers.length != 0) {
        next = timers.reduce(
            (n, { id }) => { // '{ ... }' object ; '{ xxx }' value xxx in object
                return (n < id ? id : n) 
            },
            0 // start value
        );
    }
    return next + 1;
}

function Add() {
    timers.push(
        new watch(
            { 
                "name": "New timer", 
                "start": null, 
                "id": getNextUnique(), 
                "mode": 0 
            }
        )
    );
    save();
}
function RemoveAll() {
    let rly = window.confirm("Sure?");
    if (rly == true) {
        timers.map(
            (e) => e.dispose()
        );
    }
}

function getClass(e) {
    return e.__proto__.constructor.name;
}

// stopwatch
let watches = () => {
    return document.querySelectorAll("div.list > div");
};
let list = document.querySelector("div.list");

let intervalTimer = setInterval(
    () => {
        timers.map(
            (e) => {
                e.display(false)
            }
        ) 
    }, 
    500
);

function generateModel(info) {
    let div = document.createElement('div');
    div.innerHTML = 
    '<button class="time">00:00:00</button>'
    +'<span>' + info.name + '</span>'
    +'<input type="hidden" value="' + info.id + '">'
    +'<button class="rename">Edit</button>';
    list.append(div);
    return (
        function (e) { 
            return e.item(e.length - 1) 
        }(list.children)
    );
}
let MODES = { IDLE: 0, RUN: 1 };
// #region watch
class watch {
    baseElement = null;
    id = null;
    start = null;
    end = null;
    mode = MODES.IDLE;
    name = "";
    export = true;
    constructor(element) {
        if(element == null) {return null}
        if (getClass(element) == "Object") {
            /* this.id = element.id; */
            this.id = getNextUnique();
            this.start = element.start;
            this.end = element.end;
            this.mode = element.mode;
            this.name = element.name;
            this.baseElement = generateModel(element);
        } else {
            this.baseElement = element;
            this.id = element.querySelector("input[type=hidden]").value;
        }
        (
            function (R) {
                R.baseElement.querySelector("button.time").addEventListener('click', R.click.bind(R));
                R.baseElement.querySelector("button.time").addEventListener('contextmenu', R.reset.bind(R));
                R.baseElement.querySelector("button.rename").addEventListener('click', R.editName.bind(R));
            }(this)
        );
        this.update();
        this.display(true);
        // save()
    }
    dispose() {
        if (
            this.mode == MODES.IDLE && // timer is in IDLE
            this.start == null && // IS Reseted
            this.end == null // same
        )
        {
            this.export = false;
            this.baseElement.outerHTML = "";
            save()
            return true;
        } else {
            return false;
        }
    }
    isDisposable() {
        return (
            this.mode == MODES.IDLE && // timer is in IDLE
            this.start == null && // IS Reseted
            this.end == null // same
        )
    }
    equals(e) {
        return (
            e == this.baseElement || e == this.id
        );
    }
    update() {
        switch (this.mode) {
            case MODES.RUN:
                this.baseElement.querySelector("button.time").classList.value = "time button-run";
                break;
            default:
            case MODES.IDLE:
                this.baseElement.querySelector("button.time").classList.value = "time button-stop";
                break;
        }
    }
    click() {
        if (this.mode == MODES.IDLE) { /* notruning */
            let time;
            if ((this.end || null) == null)
                time = Date.now();
            else
                time = (Date.now() - (this.end - this.start + 0));
            this.end = null;
            this.start = time;
            this.mode = MODES.RUN;
        } else {/* runs */
            let time = new Date();
            this.end = time.getTime();
            this.mode = MODES.IDLE;
        }
        this.update();
        save()
    }
    reset(e) {
        try { e.preventDefault() } catch (e) { };
        if (this.mode == MODES.IDLE) {
            this.start = null;
            this.end = null;
        }
        this.update();
        this.display(true);
        save()
    }
    editName() {
        // new Popup here 
        // if (this.baseElement) {
        // }
        (async (R) => {
            let old_name = R.name;
            let new_name = await popup('Neuer Name', R.name, 'Speichern', 'Abbrechen'); // this waits till the user does sommething
            if (new_name != '') {
                if(new_name.match(/([+-]\d+)$/gm)!=null) {
                    let spliter = Array.from(new_name.matchAll(/(.*)([+-]\d+)$/gm)); // [<full>,<textOnly>,<modifierOnly>]
                    new_name = spliter[0][1];
                    let timeDifference = parseInt(spliter[0][2]);
                    if(timeDifference == NaN){ timeDifference = 0; }
                    if(R.start == null){
                        R.start = 1;
                        R.end = (timeDifference*60000)+1;
                    } else {
                        R.start = R.start - (timeDifference*60000);
                    }
                    // update display incase the timer is paused
                    this.display(true);
                    // R.start = R.start - 
                    // debugger;
                }
                R.name = new_name;
                save();
            } else {
                if(R.isDisposable() == true) {
                    let dispose = await popup('Möchtest du \''+old_name+'\' Löschen?', null, 'Löschen', 'Abbrechen');
                    if(dispose == true)
                    {
                        // console.log(dispose);
                        // window.R = R;
                        R.dispose()
                        
                    }
                } else {

                }
            }
            R.baseElement.querySelector('span').innerText = R.name;
        }
        )(this)
    }
    display(first = false) {
        let zero = new Date("2000-01-01 00:00:00");
        zero = new Date(zero.getTime() - zero.getTimezoneOffset());
        if (this.mode == MODES.IDLE && first == true) {
            if (this.start == null || this.start == 0)
                this.baseElement.querySelector("button").innerText = "00:00:00";
            else {
                let calc = new Date(this.end - this.start + zero.getTime());
                this.baseElement.querySelector("button").innerText =
                    (calc.getHours().toString().length == 1 ? "0" : "") +
                    calc.getHours() +
                    ":" +
                    (calc.getMinutes().toString().length == 1 ? "0" : "") +
                    calc.getMinutes() +
                    ":" +
                    (calc.getSeconds().toString().length == 1 ? "0" : "") +
                    calc.getSeconds();
            }
        } else if (this.mode == MODES.RUN) { /* mode=MODES.RUN */
            let calc = new Date(Date.now() - this.start + zero.getTime());
            this.baseElement.querySelector("button").innerText =
                (calc.getHours().toString().length == 1 ? "0" : "") +
                calc.getHours() +
                ":" +
                (calc.getMinutes().toString().length == 1 ? "0" : "") +
                calc.getMinutes() +
                ":" +
                (calc.getSeconds().toString().length == 1 ? "0" : "") +
                calc.getSeconds();
        }
    }
    get save_value() {
        return (
            this.export == false ? null : {
                /* "id":this.id, */
                "name": this.name,
                "start": this.start,
                "end": this.end,
                "mode": this.mode
            }
        )
    }
}
// #endregion
function save() {
    localStorage.setItem(
        global_storage,
        JSON.stringify(
            timers.map(
                (e) => e.save_value
            ).filter(
                (e)=>{
                    return e!=null
                }
            )
        )
    )
    console.log("Data Saved!");
}
var loaded = false;
let data;
function load() {
    if (loaded == true) return;
    loaded = true;
    console.log("Loading Data...");
    // console.info(arguments);
    data = JSON.parse(
        localStorage.getItem(
            global_storage
        ) || []
    )
    if (data == [] || data.length == 0) return;
    data.map(
        (e) => timers.push(
            new watch(e)
        )
    )
    console.log("Data Loaded!");
}

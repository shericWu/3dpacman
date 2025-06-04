const CHECKBOX = [
    "checkbox-sound",
    "checkbox-accel",
    "checkbox-lightout",
    "checkbox-torment",
    "checkbox-redgreen",
    "checkbox-model",
    "checkbox-debug"
]

const LIVES_NUM = "lives_num";

const STORAGE_MODE = [
    "MODE_SOUND",
    "MODE_ACCELERATE",
    "MODE_LIGHTOUT",
    "MODE_HARD",
    "MODE_REDGREEN",
    "MODE_MODEL",
    "MODE_DEBUG"
]

const STORAGE_NUM = "LIFE";

const DEFAULT_ON = [
    "true",
    "true",
    "true",
    "false",
    "false",
    "true",
    "false"
]

const DEFAULT_NUM = "1";

if (sessionStorage.getItem("MODE_SOUND") == null) {
    sessionStorage.clear();
    for (let i = 0; i < CHECKBOX.length; i++) {
        sessionStorage.setItem(STORAGE_MODE[i], DEFAULT_ON[i]);
    }
    sessionStorage.setItem(STORAGE_NUM, DEFAULT_NUM);
}

for (let i = 0; i < CHECKBOX.length; i++) {
    document.getElementById(CHECKBOX[i]).checked
        = (sessionStorage.getItem(STORAGE_MODE[i]) === "true")? true : false;
}
document.getElementById(LIVES_NUM).textContent = (sessionStorage.getItem(STORAGE_NUM) == null)? DEFAULT_NUM : sessionStorage.getItem(STORAGE_NUM);

add_event_listener();

function hideOptions_mode() {
    document.getElementById("mode_choose").style.display = "none";
    let value;
    for (let i = 0; i < CHECKBOX.length; i++) {
        value = (document.getElementById(CHECKBOX[i]).checked)? "true" : "false";
        sessionStorage.setItem(STORAGE_MODE[i], value);
    }
    value = document.getElementById(LIVES_NUM).textContent;
    sessionStorage.setItem(STORAGE_NUM, value);
}

function hideOptions_person() {
    document.getElementById("person").style.display = "none";
}

function add_event_listener() {
    document.getElementById("mode").addEventListener("click", () => {
        document.getElementById("mode_choose").style.display = "flex";
    });

    document.getElementById("credit").addEventListener("click", () => {
        document.getElementById("person").style.display = "flex";
    });

    document.getElementById("ok").addEventListener("click", () => {
        hideOptions_mode();
    });

    document.getElementById("mode_choose").addEventListener("click", () => {
        hideOptions_mode();
    });

    document.getElementById("person").addEventListener("click", () => {
        hideOptions_person();
    });

    document.getElementById("close").addEventListener("click", () => {
        hideOptions_person();
    });

    document.getElementById("plus").addEventListener("click", () => {
        let lives_num = document.getElementById(LIVES_NUM);
        let num = parseInt(lives_num.textContent);
        num++;

        document.getElementById(LIVES_NUM).textContent = num;
    });

    document.getElementById("minus").addEventListener("click", () => {
        let lives_num = document.getElementById(LIVES_NUM);
        let num = parseInt(lives_num.textContent);
        num--;
        if(num <= 1)
            num = 1;

        document.getElementById(LIVES_NUM).textContent = num;
    });
}

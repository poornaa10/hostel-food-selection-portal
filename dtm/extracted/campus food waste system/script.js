function start() {
    let r = regno.value.trim();
    let n = name.value.trim();
    if (!r || !n) {
        alert("Enter student details");
        return;
    }
    show("login", "breakfast");
}

function next(a, b) {
    show(a, b);
}

function back(a, b) {
    show(a, b);
}

function show(hide, show) {
    document.getElementById(hide).classList.add("hidden");
    document.getElementById(show).classList.remove("hidden");
}

function save() {
    let dinner = document.querySelector('input[name="dinner"]:checked');
    if (!dinner) {
        alert("Select dinner option");
        return;
    }

    let data = JSON.parse(localStorage.getItem("foodData")) || [];
    data.push({
        dosa: dosa.checked,
        idly: idly.checked,
        rice: rice.checked,
        dal: dal.checked,
        sambar: sambar.checked,
        chutney: chutney.checked,
        curd: curd.checked,
        dinner: dinner.value
    });

    localStorage.setItem("foodData", JSON.stringify(data));
    show("dinner", "done");
}
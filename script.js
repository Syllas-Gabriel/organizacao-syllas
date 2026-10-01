const STORAGE_KEY = "organizacaoSyllasGabriel_v4";
const LEGACY_STORAGE_KEY = "organizacaoSyllasGabriel_v3";

const defaultData = {
  payments: [
    {id:"bike", name:"Bicicleta mensal", amount:213, remaining:7, due:"Dia 10 do próximo mês"},
    {id:"bikeExtra", name:"Bicicleta — peça extra", amount:100, remaining:1, due:"Dia 10 do próximo mês"},
    {id:"ac", name:"Ar condicionado mensal", amount:112, remaining:9, due:"Dia 10 do próximo mês"},
    {id:"barber", name:"Barbearia mensal", amount:85, remaining:null, due:"Dia 22 deste mês"}
  ],
  paidPayments: {},
  paymentMonth: "",

  goals: [
    {id:"gti", name:"Caixinha Nubank", target:20000, saved:30, emoji:"💰"},
    {id:"iphone", name:"Comprar iPhone", target:null, saved:0, next:true, emoji:"📱"},
    {id:"bikeGti", name:"Montar Bicicleta GTI", target:null, saved:0, reserved:true, emoji:"🚲"},
    {id:"smartTv", name:"Smart TV pequena", target:null, saved:0, reserved:true, emoji:"📺"},
    {id:"academia", name:"Academia", target:null, saved:0, reserved:true, emoji:"🏋️"},
    {id:"frigobar", name:"Frigobar", target:null, saved:0, reserved:true, emoji:"🧊"},
    {id:"honda", name:"Consorcio Honda CG 160 Titan", target:null, saved:0, reserved:true, emoji:"🏍️"}
  ],

  expenses: [
    {id:"1790113222399", name:"extras no instalamento da central", value:20, date:"2026-09-18"},
    {id:"1790113242815", name:"Banana", value:5, date:"2026-09-22"}
  ],
  expenseHistory: {},
  workedDays: {
    "2026-09-01":true,
    "2026-09-02":true,
    "2026-09-04":true,
    "2026-09-05":true,
    "2026-09-07":true,
    "2026-09-08":true,
    "2026-09-10":true,
    "2026-09-11":true,
    "2026-09-12":true,
    "2026-09-14":true,
    "2026-09-15":true,
    "2026-09-16":true,
    "2026-09-17":true,
    "2026-09-19":true,
    "2026-09-22":true
  },
  tasks: [],
  notes: []
};

let data;
let calendarDate = new Date();
let expenseDateView = new Date();

function monthKey(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

function currentMonthKey(){
  return monthKey(new Date());
}

function monthLabel(date){
  const text = date.toLocaleDateString("pt-BR", {month:"long", year:"numeric"});
  return text[0].toUpperCase() + text.slice(1);
}

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function normalizeData(saved){
  const result = {
    ...clone(defaultData),
    ...saved
  };

  result.payments = Array.isArray(saved.payments) && saved.payments.length
    ? saved.payments : clone(defaultData.payments);
  result.goals = Array.isArray(saved.goals) && saved.goals.length
    ? saved.goals : clone(defaultData.goals);
  result.expenses = Array.isArray(saved.expenses) ? saved.expenses : [];
  result.expenseHistory = saved.expenseHistory || {};
  result.workedDays = saved.workedDays || {};
  result.tasks = Array.isArray(saved.tasks) ? saved.tasks : [];
  result.notes = Array.isArray(saved.notes) ? saved.notes : [];
  const bikePayment = result.payments.find(p => p.id === "bike");
  if(bikePayment) bikePayment.amount = 213;
  result.paidPayments = saved.paidPayments || {};

  // Mantém a alteração solicitada para o ar condicionado.
  const ac = result.payments.find(p => p.id === "ac");
  if(ac && (!saved.paymentVersion || saved.paymentVersion < 2)){
    ac.remaining = 9;
  }

  // Garante as metas novas sem apagar as metas existentes.
  const requiredGoals = clone(defaultData.goals);
  requiredGoals.forEach(required => {
    if(!result.goals.some(g => g.id === required.id)){
      result.goals.push(required);
    }
  });

  const nubank = result.goals.find(g => g.id === "gti");
  if(nubank) nubank.target = 20000;

  result.paymentVersion = 2;
  return result;
}

function hasUsefulData(saved){
  if(!saved || typeof saved !== "object") return false;
  const payments = Array.isArray(saved.payments) ? saved.payments : [];
  const goals = Array.isArray(saved.goals) ? saved.goals : [];
  const expenses = Array.isArray(saved.expenses) ? saved.expenses : [];
  const worked = saved.workedDays && typeof saved.workedDays === "object"
    ? Object.keys(saved.workedDays).length : 0;

  return payments.length > 0 || goals.length > 0 || expenses.length > 0 ||
         worked > 0 || (Array.isArray(saved.tasks) && saved.tasks.length > 0);
}

function loadData(){
  let saved = null;

  // Primeiro tenta a versão atual.
  try{
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  }catch(e){}

  // Se não existir, tenta recuperar a versão anterior.
  if(!hasUsefulData(saved)){
    try{
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
      if(hasUsefulData(legacy)) saved = legacy;
    }catch(e){}
  }

  // Se não houver dados úteis, inicia com o pacote completo que você forneceu.
  if(!hasUsefulData(saved)){
    saved = clone(defaultData);
  }

  data = normalizeData(saved);

  // Garante os dados de setembro que foram fornecidos, sem duplicar.
  if(currentMonthKey() === "2026-09"){
    defaultData.expenses.forEach(exp => {
      if(!data.expenses.some(e => e.id === exp.id)) data.expenses.push(clone(exp));
    });
    Object.keys(defaultData.workedDays).forEach(day => {
      data.workedDays[day] = true;
    });
  }

  // Sempre garante o limite e o saldo inicial da Caixinha.
  const nubank = data.goals.find(g => g.id === "gti");
  if(nubank){
    nubank.target = 20000;
    if(typeof nubank.saved !== "number") nubank.saved = 30;
  }

  if(!data.paymentMonth) data.paymentMonth = currentMonthKey();

  saveData();
  return data;
}

function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Inicializa os dados somente depois que `data` já existe.
data = loadData();

function prepareNewMonth(){
  const nowKey = currentMonthKey();

  if(!data.paymentMonth){
    data.paymentMonth = nowKey;
    saveData();
    return;
  }

  if(data.paymentMonth !== nowKey){
    // Arquiva os gastos do mês anterior e começa o novo mês limpo.
    data.expenseHistory[data.paymentMonth] = clone(data.expenses);
    data.expenses = [];
    data.paidPayments = {};
    data.paymentMonth = nowKey;
    saveData();
  }
}

function money(value){
  return value.toLocaleString("pt-BR", {
    style:"currency",
    currency:"BRL"
  });
}

function renderPayments(){
  const box = document.querySelector("#payments");
  const now = new Date();

  document.querySelector("#paymentMonth").textContent = monthLabel(now);

  box.innerHTML = data.payments.map(p => {
    const paid = !!data.paidPayments[p.id];
    const completed = p.remaining !== null && p.remaining <= 0;

    const remainingText =
      p.remaining === null
        ? "Pagamento mensal"
        : completed
          ? "Todas as parcelas foram pagas"
          : `Faltam ${p.remaining} parcela${p.remaining === 1 ? "" : "s"}`;

    return `
      <div class="payment ${completed ? "payment-complete" : ""}">
        <div>
          <h3>${escapeHTML(p.name)}</h3>
          <p>${remainingText} • ${escapeHTML(p.due)}</p>
        </div>

        <span class="amount">${money(p.amount)}</span>

        ${
          completed
            ? `<span class="payment-done">✓</span>`
            : `
              <button class="check ${paid ? "paid" : ""}" data-pay="${p.id}">
                ${paid ? "✓" : "○"}
              </button>
            `
        }
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-pay]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.pay;
      const payment = data.payments.find(p => p.id === id);
      const wasPaid = !!data.paidPayments[id];

      if(!payment) return;

      if(wasPaid){
        delete data.paidPayments[id];
        if(payment.remaining !== null) payment.remaining++;
      } else {
        data.paidPayments[id] = true;
        if(payment.remaining !== null && payment.remaining > 0) payment.remaining--;
      }

      saveData();
      renderAll();
    });
  });

  const paidTotal = data.payments
    .filter(p => data.paidPayments[p.id])
    .reduce((sum,p) => sum + p.amount,0);

  document.querySelector("#monthlyPayments").textContent =
    money(paidTotal) + " pagos";
}

function renderGoals(){
  const box = document.querySelector("#goals");

  box.innerHTML = data.goals.map(g => {
    if(g.next || g.reserved){
      return `
        <div class="goal reserved-goal">
          <div class="goal-top">
            <h3>${g.emoji || "🎯"} ${escapeHTML(g.name)}</h3>
            <small>${g.next ? "Próxima meta" : "Meta reservada"}</small>
          </div>
          <p>Meta reservada.</p>
        </div>
      `;
    }

    const pct = Math.min(100, (g.saved / g.target) * 100);
    const done = g.saved >= g.target;

    return `
      <div class="goal">
        <div class="goal-top">
          <h3>${g.emoji || "🎯"} ${escapeHTML(g.name)}</h3>
          <strong>${money(g.saved)} / ${money(g.target)}</strong>
        </div>

        <div class="progress">
          <span style="width:${pct}%"></span>
        </div>

        <small>${done ? "✅ Meta concluída!" : `${pct.toFixed(0)}% concluído`}</small>

        ${
          done ? "" : `
            <div class="goal-input">
              <input id="goalValue" type="number" min="0" step="0.01" placeholder="Quanto você juntou agora?">
              <button class="primary" id="addGoal">Adicionar</button>
            </div>
          `
        }
      </div>
    `;
  }).join("");

  const add = document.querySelector("#addGoal");
  if(add){
    add.addEventListener("click", () => {
      const input = document.querySelector("#goalValue");
      const value = Number(input.value);

      if(value > 0){
        const goal = data.goals.find(g => g.id === "gti");
        if(goal) goal.saved += value;
        saveData();
        renderAll();
      }
    });
  }

  const g = data.goals.find(x => x.id === "gti");
  if(g){
    document.querySelector("#bikeProgress").textContent =
      `${money(g.saved)} / ${money(g.target)}`;
  }
}

function getExpensesForMonth(key){
  if(key === currentMonthKey()) return data.expenses;
  return data.expenseHistory[key] || [];
}

function renderExpenses(){
  const key = monthKey(expenseDateView);
  const expenses = getExpensesForMonth(key);
  const isCurrent = key === currentMonthKey();

  document.querySelector("#expenseMonthLabel").textContent = monthLabel(expenseDateView);
  document.querySelector("#expensesTitle").textContent =
    `Gastos do mês ${monthLabel(expenseDateView).split(" ")[0]}`;

  document.querySelector("#prevExpenseMonth").disabled = false;
  document.querySelector("#nextExpenseMonth").disabled = !isCurrent;

  const box = document.querySelector("#expenses");

  if(!expenses.length){
    box.innerHTML = `<p>Nenhum gasto extra anotado neste mês.</p>`;
  } else {
    box.innerHTML = expenses.map(e => `
      <div class="expense">
        <div class="expense-info">
          <strong>${escapeHTML(e.name)}</strong>
          <small>${formatDate(e.date)}</small>
        </div>
        <strong>${money(e.value)}</strong>
        ${
          isCurrent
            ? `<button class="delete" data-expense="${e.id}">Excluir</button>`
            : ""
        }
      </div>
    `).join("");
  }

  document.querySelectorAll("[data-expense]").forEach(btn => {
    btn.addEventListener("click", () => {
      data.expenses = data.expenses.filter(e => e.id !== btn.dataset.expense);
      saveData();
      renderAll();
    });
  });

  const total = expenses.reduce((sum,e) => sum + e.value, 0);
  document.querySelector("#extraTotal").textContent = money(total);
}

document.querySelector("#addExpense").addEventListener("click", () => {
  const name = document.querySelector("#expenseName").value.trim();
  const value = Number(document.querySelector("#expenseValue").value);
  const date = document.querySelector("#expenseDate").value;

  if(!name || value <= 0 || !date){
    alert("Preencha o gasto, o valor e a data.");
    return;
  }

  const selectedKey = date.slice(0,7);

  if(selectedKey !== currentMonthKey()){
    alert("Só é possível adicionar gastos no mês atual. Os meses anteriores ficam salvos para consulta.");
    return;
  }

  data.expenses.push({
    id:Date.now().toString(),
    name,
    value,
    date
  });

  saveData();

  document.querySelector("#expenseName").value = "";
  document.querySelector("#expenseValue").value = "";
  expenseDateView = new Date();
  renderAll();
});

document.querySelector("#prevExpenseMonth").addEventListener("click", () => {
  expenseDateView.setMonth(expenseDateView.getMonth() - 1);
  renderExpenses();
});

document.querySelector("#nextExpenseMonth").addEventListener("click", () => {
  if(monthKey(expenseDateView) !== currentMonthKey()){
    expenseDateView.setMonth(expenseDateView.getMonth() + 1);
    renderExpenses();
  }
});

function renderCalendar(){
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  document.querySelector("#calendarTitle").textContent = monthLabel(calendarDate);

  const calendar = document.querySelector("#calendar");
  const names = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  calendar.innerHTML = names.map(n => `<div class="day-name">${n}</div>`).join("");

  const first = new Date(year,month,1).getDay();
  const totalDays = new Date(year,month + 1,0).getDate();

  for(let i = 0; i < first; i++){
    calendar.innerHTML += `<div class="day empty"></div>`;
  }

  let monthTotal = 0;
  let weekdays = 0;
  let saturdays = 0;
  let worked = 0;

  for(let day = 1; day <= totalDays; day++){
    const key = dateKey(year,month,day);
    const weekday = new Date(year,month,day).getDay();

    const value =
      weekday === 6 ? 50 :
      weekday === 0 ? 0 : 30;

    const isWorked = !!data.workedDays[key];

    if(isWorked){
      worked++;
      monthTotal += value;
      if(weekday === 6) saturdays += 50;
      else if(weekday !== 0) weekdays += 30;
    }

    calendar.innerHTML += `
      <div class="day ${isWorked ? "worked" : ""}" data-day="${key}">
        <span class="day-number">${day}</span>
        ${
          value
            ? `<span class="day-value">${isWorked ? "✓ " : ""}${money(value)}</span>`
            : `<span class="day-value">folga</span>`
        }
      </div>
    `;
  }

  document.querySelectorAll("[data-day]").forEach(el => {
    el.addEventListener("click", () => {
      const key = el.dataset.day;

      if(data.workedDays[key]) delete data.workedDays[key];
      else data.workedDays[key] = true;

      saveData();
      renderAll();
    });
  });

  document.querySelector("#daysWorked").textContent = worked;
  document.querySelector("#weekdayTotal").textContent = money(weekdays);
  document.querySelector("#saturdayTotal").textContent = money(saturdays);
  document.querySelector("#calendarTotal").textContent = money(monthTotal);

  const currentPrefix = `${currentMonthKey()}-`;
  document.querySelector("#workTotal").textContent =
    money(Object.keys(data.workedDays).filter(key => key.startsWith(currentPrefix)).reduce((total,key) => {
      const [y,m,d] = key.split("-").map(Number);
      const weekday = new Date(y,m - 1,d).getDay();
      return total + (weekday === 6 ? 50 : weekday === 0 ? 0 : 30);
    },0));
}

document.querySelector("#prevMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

function renderTasks(){
  const box = document.querySelector("#tasks");
  if(!data.tasks.length){ box.innerHTML = "<p>Nenhuma tarefa adicionada.</p>"; return; }
  box.innerHTML = data.tasks.map(task => `
    <div class="task ${task.done ? "done" : ""}" data-task="${task.id}">
      <span class="task-text">${escapeHTML(task.text)}</span>
      ${task.done ? '<span class="task-check" aria-label="Concluída">✅</span>' : ''}
      <button type="button" class="task-delete" data-delete-task="${task.id}" aria-label="Apagar tarefa">X</button>
    </div>`).join("");
  box.querySelectorAll("[data-task]").forEach(el => el.addEventListener("click", e => {
    if(e.target.closest("[data-delete-task]")) return;
    const task = data.tasks.find(t => t.id === el.dataset.task);
    if(task) task.done = !task.done;
    saveData(); renderTasks();
  }));
  box.querySelectorAll("[data-delete-task]").forEach(btn => btn.addEventListener("click", () => {
    data.tasks = data.tasks.filter(t => t.id !== btn.dataset.deleteTask);
    saveData(); renderTasks();
  }));
}

document.querySelector("#addTask").addEventListener("click", addTask);

document.querySelector("#taskInput").addEventListener("keydown", e => {
  if(e.key === "Enter") addTask();
});

function addTask(){
  const input = document.querySelector("#taskInput");
  const text = input.value.trim();

  if(!text) return;

  data.tasks.push({
    id: Date.now().toString(),
    text,
    done:false
  });

  input.value = "";
  saveData();
  renderTasks();
}

let editingNoteId = null;

const openedNotes = new Set();
function renderNotes(){
  const box = document.querySelector("#notes");
  if(!data.notes.length){ box.innerHTML = '<p>Nenhuma anotação ainda. Crie sua primeira nota acima.</p>'; return; }
  box.innerHTML = data.notes.map(note => {
    const opened = openedNotes.has(note.id);
    return `<article class="note-card">
      <h3>${escapeHTML(note.title || "Sem título")}</h3>
      <div class="note-content ${opened ? "" : "hidden"}"><p>${escapeHTML(note.content).replace(/\n/g,"<br>")}</p></div>
      <div class="note-actions">
        <button type="button" data-toggle-note="${note.id}">${opened ? "Fechar nota" : "Abrir nota"}</button>
        <button type="button" data-edit-note="${note.id}">Editar</button>
        <button type="button" class="note-delete" data-delete-note="${note.id}">Excluir</button>
      </div>
    </article>`;
  }).join("");
  box.querySelectorAll("[data-toggle-note]").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.toggleNote;
    if(openedNotes.has(id)) openedNotes.delete(id); else openedNotes.add(id);
    renderNotes();
  }));
  box.querySelectorAll("[data-edit-note]").forEach(button => button.addEventListener("click", () => {
    const note = data.notes.find(item => item.id === button.dataset.editNote);
    if(!note) return;
    editingNoteId = note.id;
    document.querySelector("#noteTitle").value = note.title;
    document.querySelector("#noteContent").value = note.content;
    document.querySelector("#saveNote").textContent = "Atualizar anotação";
    document.querySelector("#noteTitle").focus();
  }));
  box.querySelectorAll("[data-delete-note]").forEach(button => button.addEventListener("click", () => {
    data.notes = data.notes.filter(item => item.id !== button.dataset.deleteNote);
    openedNotes.delete(button.dataset.deleteNote);
    if(editingNoteId === button.dataset.deleteNote) resetNoteForm();
    saveData(); renderNotes();
  }));
}

function resetNoteForm(){
  editingNoteId = null;
  document.querySelector("#noteTitle").value = "";
  document.querySelector("#noteContent").value = "";
  document.querySelector("#saveNote").textContent = "Salvar anotação";
}

document.querySelector("#saveNote").addEventListener("click", () => {
  const title = document.querySelector("#noteTitle").value.trim();
  const content = document.querySelector("#noteContent").value.trim();
  if(!title && !content) return;
  if(editingNoteId){
    const note = data.notes.find(item => item.id === editingNoteId);
    if(note){ note.title = title || "Sem título"; note.content = content; }
  }else{
    data.notes.unshift({id:Date.now().toString(), title:title || "Sem título", content});
  }
  saveData();
  resetNoteForm();
  renderNotes();
});

let calcExpression = "";
let calcJustEvaluated = false;

function renderCalculator(){
  document.querySelector("#calcDisplay").value = calcExpression || "0";
}

function calculateResult(){
  if(!calcExpression) return;

  try{
    if(!/^[0-9+\-*/%.() ]+$/.test(calcExpression)) throw new Error();

    const result = Function(`"use strict"; return (${calcExpression})`)();

    if(!Number.isFinite(result)) throw new Error();

    calcExpression = String(result);
    calcJustEvaluated = true;
    renderCalculator();
  }catch(e){
    calcExpression = "";
    document.querySelector("#calcDisplay").value = "Erro";
    calcJustEvaluated = true;
  }
}

document.querySelectorAll("[data-calc]").forEach(button => {
  button.addEventListener("click", () => {
    const type = button.dataset.calc;
    const value = button.dataset.value;

    if(type === "clear"){
      calcExpression = "";
      calcJustEvaluated = false;
      renderCalculator();
      return;
    }

    if(type === "backspace"){
      if(calcJustEvaluated) calcExpression = "";
      else calcExpression = calcExpression.slice(0,-1);
      calcJustEvaluated = false;
      renderCalculator();
      return;
    }

    if(type === "equals"){
      calculateResult();
      return;
    }

    if(type === "number"){
      if(calcJustEvaluated){
        calcExpression = "";
        calcJustEvaluated = false;
      }
      calcExpression += value;
      renderCalculator();
      return;
    }

    if(type === "decimal"){
      if(calcJustEvaluated){
        calcExpression = "";
        calcJustEvaluated = false;
      }

      const currentPart = calcExpression.split(/[+\-*/%]/).pop();
      if(!currentPart.includes(".")){
        calcExpression += currentPart ? "." : "0.";
      }
      renderCalculator();
      return;
    }

    if(type === "operator"){
      if(calcJustEvaluated) calcJustEvaluated = false;
      if(!calcExpression && value !== "-") return;

      if(/[+\-*/%.]$/.test(calcExpression)){
        calcExpression = calcExpression.slice(0,-1);
      }

      calcExpression += value;
      renderCalculator();
    }
  });
});

document.addEventListener("keydown", e => {
  const allowed = "0123456789+-*/%.";
  if(allowed.includes(e.key)){
    document.querySelector(`[data-calc][data-value="${CSS.escape(e.key)}"]`)?.click();
  }else if(e.key === "Enter"){
    document.querySelector('[data-calc="equals"]')?.click();
  }else if(e.key === "Backspace"){
    document.querySelector('[data-calc="backspace"]')?.click();
  }else if(e.key === "Escape"){
    document.querySelector('[data-calc="clear"]')?.click();
  }
});

document.querySelector("#showMoreButton").addEventListener("click", () => {
  document.querySelector("#extraTabs").classList.remove("hidden");
  document.querySelector("#showMoreButton").classList.add("hidden");
});

document.querySelector("#showLessButton").addEventListener("click", () => {
  document.querySelector("#extraTabs").classList.add("hidden");
  document.querySelector("#showMoreButton").classList.remove("hidden");
});

function dateKey(y,m,d){
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function formatDate(date){
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR");
}

function escapeHTML(text){
  return String(text).replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

// ---------- TEMA ----------

document.querySelector("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("light");

  document.querySelector("#themeButton").textContent =
    document.body.classList.contains("light")
      ? "🌙 Tema escuro"
      : "☀️ Tema claro";
});

// ---------- RENDERIZAR TUDO ----------

function renderAll(){
  prepareNewMonth();
  renderPayments();
  renderGoals();
  renderExpenses();
  renderCalendar();
  renderTasks();
  renderNotes();
  renderCalculator();
}

// ---------- DATA INICIAL ----------

document.querySelector("#expenseDate").value =
  new Date().toISOString().slice(0,10);

calendarDate = new Date();
expenseDateView = new Date();

renderAll();

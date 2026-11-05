async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

function showMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#b54747" : "#6558c8";
}

// Registration page
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("message");
    const data = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value
    };
    try {
      const result = await api("/api/register", {
        method: "POST",
        body: JSON.stringify(data)
      });
      showMessage(message, result.message);
      registerForm.reset();
      setTimeout(() => location.href = "/login.html", 900);
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });
}

// Login page
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("message");
    const data = {
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value
    };
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify(data) });
      location.href = "/dashboard.html";
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });
}

// Dashboard
const studentForm = document.getElementById("studentForm");
if (studentForm) {
  const message = document.getElementById("dashboardMessage");
  const recordsList = document.getElementById("recordsList");
  const recordId = document.getElementById("recordId");
  const cancelEdit = document.getElementById("cancelEdit");
  let records = [];

  async function loadDashboard() {
    try {
      const result = await api("/api/me");
      document.getElementById("welcomeName").textContent = `Hello, ${result.user.name}`;
      await loadRecords();
    } catch {
      location.href = "/login.html";
    }
  }

  async function loadRecords() {
    records = await api("/api/students");
    document.getElementById("recordCount").textContent = records.length;
    recordsList.replaceChildren();

    if (records.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No portfolio details yet. Add your first record using the form.";
      recordsList.appendChild(empty);
      return;
    }

    records.forEach(record => {
      const card = document.createElement("article");
      card.className = "record";

      const title = document.createElement("h3");
      title.textContent = record.name;
      const course = document.createElement("p");
      course.textContent = `Course: ${record.course}`;
      const email = document.createElement("p");
      email.textContent = `Email: ${record.email}`;
      const skills = document.createElement("p");
      skills.className = "record-skills";
      skills.textContent = record.skills ? `Skills: ${record.skills}` : "Skills: Not added";
      const about = document.createElement("p");
      about.textContent = record.about || "No introduction added.";

      const actions = document.createElement("div");
      actions.className = "record-actions";
      const edit = document.createElement("button");
      edit.className = "button small secondary";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => startEdit(record));
      const remove = document.createElement("button");
      remove.className = "button small delete-button";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteRecord(record.id));

      actions.append(edit, remove);
      card.append(title, course, email, skills, about, actions);
      recordsList.appendChild(card);
    });
  }

  function startEdit(record) {
    recordId.value = record.id;
    document.getElementById("studentName").value = record.name;
    document.getElementById("course").value = record.course;
    document.getElementById("studentEmail").value = record.email;
    document.getElementById("skills").value = record.skills || "";
    document.getElementById("about").value = record.about || "";
    document.getElementById("formTitle").textContent = "Update portfolio details";
    document.getElementById("saveButton").textContent = "Update details";
    cancelEdit.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    studentForm.reset();
    recordId.value = "";
    document.getElementById("formTitle").textContent = "Add portfolio details";
    document.getElementById("saveButton").textContent = "Save details";
    cancelEdit.hidden = true;
  }

  cancelEdit.addEventListener("click", resetForm);

  studentForm.addEventListener("submit", async event => {
    event.preventDefault();
    const data = {
      name: document.getElementById("studentName").value.trim(),
      course: document.getElementById("course").value.trim(),
      email: document.getElementById("studentEmail").value.trim(),
      skills: document.getElementById("skills").value.trim(),
      about: document.getElementById("about").value.trim()
    };
    const id = recordId.value;
    try {
      const result = await api(id ? `/api/students/${id}` : "/api/students", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      });
      showMessage(message, result.message);
      resetForm();
      await loadRecords();
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });

  async function deleteRecord(id) {
    if (!confirm("Are you sure you want to delete this portfolio record?")) return;
    try {
      const result = await api(`/api/students/${id}`, { method: "DELETE" });
      showMessage(message, result.message);
      await loadRecords();
    } catch (error) {
      showMessage(message, error.message, true);
    }
  }

  document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
      await api("/api/logout", { method: "POST" });
      location.href = "/";
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });

  loadDashboard();
}

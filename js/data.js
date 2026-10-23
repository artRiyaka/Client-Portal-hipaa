(function () {
  const TEMPLATES = [
    {
      id: "t01",
      title: "Welcome packet",
      detail: "First materials for someone new to the practice.",
      steps: ["Review the welcome note", "Confirm the name they want used", "Note communication preferences"]
    },
    {
      id: "t02",
      title: "Consent forms",
      detail: "Treatment consent for the pilot chart.",
      steps: ["Open the consent packet", "Confirm each signature line", "File the completed packet"]
    },
    {
      id: "t03",
      title: "Name on file",
      detail: "Make sure the chart name matches what the client expects.",
      steps: ["Confirm the legal name on file", "Confirm the name staff should use", "Note any spelling to watch"]
    },
    {
      id: "t04",
      title: "Coverage check",
      detail: "Plan details without copying extra identifiers into notes.",
      steps: ["Confirm the plan name", "Confirm the member number is on file", "Note the coverage start", "Flag anything incomplete"]
    },
    {
      id: "t05",
      title: "Emergency contact",
      detail: "Who to reach if a visit needs a backup person.",
      steps: ["Add a primary contact", "Add a backup contact", "Confirm the contact method works"]
    },
    {
      id: "t06",
      title: "Pharmacy on file",
      detail: "Where prescriptions should be sent.",
      steps: ["Confirm the preferred pharmacy", "Confirm the location", "Note any pickup limits"]
    },
    {
      id: "t07",
      title: "Medication list",
      detail: "A current list for the care team to review.",
      steps: ["List current medications", "Note the dose schedule", "Flag questions for the clinician", "Mark the list ready for review"]
    },
    {
      id: "t08",
      title: "Allergy review",
      detail: "Known reactions, or a clear note that none were reported.",
      steps: ["Record known allergies", "Note the reaction type", "Confirm if none were reported"]
    },
    {
      id: "t09",
      title: "Care goals",
      detail: "A short list the client actually wants to work on.",
      steps: ["Draft three goals", "Rank them by priority", "Review them with the care team"]
    },
    {
      id: "t10",
      title: "Visit scheduling",
      detail: "Get the next visit on the calendar.",
      steps: ["Offer two time windows", "Confirm the appointment", "Add it to the visit list"]
    },
    {
      id: "t11",
      title: "Transportation",
      detail: "How they will get to the visit.",
      steps: ["Ask about ride needs", "Note pickup constraints", "Confirm the plan for the next visit"]
    },
    {
      id: "t12",
      title: "Intake questionnaire",
      detail: "The short intake, checked for gaps.",
      steps: ["Send the questionnaire", "Review the answers", "Flag incomplete items"]
    },
    {
      id: "t13",
      title: "Records request",
      detail: "Prior records the team still needs.",
      steps: ["Identify prior providers", "Send the records request", "Log the expected arrival", "File anything that comes in"]
    },
    {
      id: "t14",
      title: "Privacy notice",
      detail: "Show how information is handled in this practice.",
      steps: ["Share the privacy notice", "Confirm it was reviewed", "Record the acknowledgment"]
    },
    {
      id: "t15",
      title: "Portal orientation",
      detail: "A quick tour of this checklist.",
      steps: ["Point out the task list", "Show how to mark a step", "Confirm they can find open items"]
    },
    {
      id: "t16",
      title: "Care team intro",
      detail: "Who is on the team and how to reach the desk.",
      steps: ["Name the coordinator", "Name the clinician", "Share how to reach the desk"]
    },
    {
      id: "t17",
      title: "Language access",
      detail: "Preferred language and interpreter needs.",
      steps: ["Confirm the preferred language", "Arrange an interpreter if needed", "Note any format they prefer"]
    },
    {
      id: "t18",
      title: "Access needs",
      detail: "Room setup and visit access.",
      steps: ["Ask about access needs", "Note mobility or sensory needs", "Plan the room setup"]
    },
    {
      id: "t19",
      title: "Billing setup",
      detail: "Who handles bills and how they prefer to pay.",
      steps: ["Confirm the billing contact", "Review the estimate range", "Note the payment preference"]
    },
    {
      id: "t20",
      title: "Release of information",
      detail: "Who else may receive updates.",
      steps: ["Identify who may receive updates", "Complete the release form", "Set an end date", "File the signed form"]
    },
    {
      id: "t21",
      title: "Home setup",
      detail: "A light check before home-based follow-up.",
      steps: ["Review the home setup questions", "Note any fall risks", "List follow-up items"]
    },
    {
      id: "t22",
      title: "Nutrition screen",
      detail: "A short screen, not a full diet history.",
      steps: ["Complete the short screen", "Note the usual pattern", "Flag a referral if needed"]
    },
    {
      id: "t23",
      title: "Support check-in",
      detail: "How they want to be supported between visits.",
      steps: ["Complete the brief check-in", "Note support preferences", "Share the crisis resources card"]
    },
    {
      id: "t24",
      title: "Sleep routine",
      detail: "A snapshot of sleep, plus one small change.",
      steps: ["Ask about the sleep window", "Note disruptions", "Pick one small change"]
    },
    {
      id: "t25",
      title: "Activity baseline",
      detail: "Current movement and a modest next target.",
      steps: ["Note current activity", "Set a modest target", "Pick a check-in date"]
    },
    {
      id: "t26",
      title: "Access setup",
      detail: "Make sure they can open this portal again.",
      steps: ["Confirm they can reach the portal", "Try one sample page together", "Note a backup contact method"]
    },
    {
      id: "t27",
      title: "Appointment prep",
      detail: "What to bring and when to arrive.",
      steps: ["List questions to ask", "Gather medication bottles", "Plan the arrival time", "Confirm the visit location"]
    },
    {
      id: "t28",
      title: "After-visit summary",
      detail: "Read the summary while the visit is still fresh.",
      steps: ["Read the summary", "Mark unclear items", "Schedule the follow-up"]
    },
    {
      id: "t29",
      title: "Care plan draft",
      detail: "Goals, owners, and the next review.",
      steps: ["Review the draft goals", "Confirm an owner for each step", "Set the next review date", "Share the draft with the client"]
    },
    {
      id: "t30",
      title: "Milestone review",
      detail: "Close finished work and name the next milestone.",
      steps: ["Confirm open items", "Archive finished steps", "Set the next milestone"]
    }
  ];

  const ROSTER = [
    { id: "c1", name: "Mara Ellison", cohort: "Intake", focus: "New client onboarding", hours: 2, done: 3, partial: 3, tasks: ["t01", "t02", "t03", "t04", "t05", "t12", "t14", "t15", "t16", "t26"] },
    { id: "c2", name: "Jonah Reeves", cohort: "Follow-up", focus: "Goals and daily routines", hours: 6, done: 5, partial: 2, tasks: ["t09", "t07", "t22", "t23", "t24", "t25", "t28", "t29", "t30", "t10"] },
    { id: "c3", name: "Priya Nandakumar", cohort: "Coverage", focus: "Records and benefits", hours: 28, done: 7, partial: 1, tasks: ["t04", "t13", "t06", "t07", "t08", "t19", "t20", "t02", "t14", "t29"] },
    { id: "c4", name: "Ellis Ward", cohort: "Access", focus: "Visits, rides, and access", hours: 4, done: 2, partial: 2, tasks: ["t11", "t17", "t18", "t10", "t15", "t26", "t05", "t21", "t27", "t01"] },
    { id: "c5", name: "Camila Ortiz", cohort: "Visit prep", focus: "Upcoming visit", hours: 9, done: 4, partial: 3, tasks: ["t10", "t27", "t07", "t11", "t16", "t28", "t09", "t06", "t30", "t26"] },
    { id: "c6", name: "Noah Pell", cohort: "Intake", focus: "Just getting started", hours: 1, done: 0, partial: 2, tasks: ["t01", "t15", "t16", "t26", "t12", "t14", "t05", "t17", "t02", "t03"] },
    { id: "c7", name: "Hannah Cho", cohort: "Follow-up", focus: "Care plan in progress", hours: 15, done: 6, partial: 1, tasks: ["t09", "t22", "t23", "t24", "t25", "t29", "t21", "t28", "t30", "t07"] },
    { id: "c8", name: "Andre Blake", cohort: "Follow-up", focus: "Wrapping the last visit", hours: 5, done: 8, partial: 1, tasks: ["t28", "t29", "t30", "t10", "t27", "t07", "t19", "t08", "t24", "t16"] },
    { id: "c9", name: "Lila Okonkwo", cohort: "Coverage", focus: "Consent and billing", hours: 32, done: 3, partial: 2, tasks: ["t02", "t04", "t14", "t19", "t20", "t03", "t13", "t01", "t06", "t12"] },
    { id: "c10", name: "Samir Haddad", cohort: "Follow-up", focus: "Steady check-ins", hours: 11, done: 4, partial: 2, tasks: ["t29", "t30", "t09", "t24", "t25", "t07", "t10", "t28", "t22", "t15"] }
  ];

  function instantiate(clientId, template, mode) {
    return {
      id: clientId + "-" + template.id,
      templateId: template.id,
      title: template.title,
      detail: template.detail,
      subtasks: template.steps.map(function (label, stepIndex) {
        return {
          id: clientId + "-" + template.id + "-s" + stepIndex,
          label: label,
          done: mode === "done" || (mode === "partial" && stepIndex === 0)
        };
      })
    };
  }

  function createSeed() {
    return {
      templates: TEMPLATES.map(function (template) {
        return {
          id: template.id,
          title: template.title,
          detail: template.detail,
          steps: template.steps.slice()
        };
      }),
      clients: ROSTER.map(function (row) {
        return {
          id: row.id,
          name: row.name,
          cohort: row.cohort,
          focus: row.focus,
          updatedAt: new Date(Date.now() - row.hours * 3600000).toISOString(),
          tasks: row.tasks.map(function (taskId, index) {
            const template = TEMPLATES.find(function (item) { return item.id === taskId; });
            let mode = "open";
            if (index < row.done) mode = "done";
            else if (index < row.done + row.partial) mode = "partial";
            return instantiate(row.id, template, mode);
          })
        };
      })
    };
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.PortalData = { createSeed: createSeed };
})();

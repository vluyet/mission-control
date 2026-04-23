export type Messages = {
  common: {
    localeName: string;
    language: string;
    english: string;
    french: string;
    workspace: string;
    status: string;
    priority: string;
    owner: string;
    due: string;
    active: string;
    tags: string;
    sort: string;
    open: string;
    review: string;
    blocked: string;
    members: string;
    complete: string;
    subtask: string;
    subtasks: string;
    noActivityYet: string;
  };
  metadata: {
    title: string;
    description: string;
  };
  shell: {
    brandTitle: string;
    brandSubtitle: string;
    workspaceLabel: string;
    navigationLabel: string;
    secondaryLabel: string;
    signOut: string;
    signingOut: string;
    versionLabel: string;
    commitLabel: string;
    languageLabel: string;
  };
  nav: {
    projects: string;
    myTasks: string;
    members: string;
    settings: string;
    queue: string;
    signIn: string;
  };
  auth: {
    missionControl: string;
    heroTitle: string;
    heroBody: string;
    ownerAccessEyebrow: string;
    signInTitle: string;
    signInBody: string;
    continueToPath: string;
    sessionExpired: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    rememberDevice: string;
    environmentAccess: string;
    submit: string;
    submitting: string;
    localOwnerAccess: string;
    dockerWorkflow: string;
    defaultError: string;
    missingCredentials: string;
    invalidCredentials: string;
  };
  authAudit: {
    ownerSignedIn: string;
    ownerSignedInRemember: string;
    ownerSignedOut: string;
  };
  taskServer: {
    noDate: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    today: string;
    tomorrow: string;
    yesterday: string;
    never: string;
    unassigned: string;
    workspaceOwner: string;
    systemActor: string;
    credentialEnabled: string;
    credentialRevoked: string;
    credentialFor: string;
    commentAdded: string;
    commentEdited: string;
    commentDeleted: string;
    agentCommentDetail: string;
    userCommentDetail: string;
    userCommentEditedDetail: string;
    userCommentDeletedDetail: string;
    attachmentAdded: string;
    attachmentUploadDetail: string;
    permissionDenied: string;
    transitionActions: {
      startWork: string;
      markBlocked: string;
      markDone: string;
      moveToReview: string;
      moveBackToTodo: string;
      resumeWork: string;
      approveDone: string;
      moveToTodo: string;
      closeAsDone: string;
      reopenTask: string;
      startExecution: string;
    };
    execution: {
      constructorDispatchAccepted: string;
      constructorDispatchFailed: string;
      constructorStatusUpdated: string;
      constructorCallbackReceived: string;
      constructorCallbackDuplicateIgnored: string;
      taskDispatched: string;
      agentAcceptedTask: string;
      agentRetrievedContext: string;
      agentFinishedTask: string;
      agentBlocked: string;
      updated: string;
    };
  };
  membersServer: {
    owner: string;
    admin: string;
    viewer: string;
    member: string;
    lead: string;
    observer: string;
    agent: string;
    human: string;
    disabled: string;
    activeTasks: string;
    workspaceRoleChanged: string;
    becameViewerRemovedFromOwnership: string;
    becameViewerRemovedFromReview: string;
    agentDisabled: string;
    agentDisabledRemovedFromAssignment: string;
    agentDisabledRemovedFromReview: string;
  };
  projectsServer: {
    atRisk: string;
    needsReview: string;
    onTrack: string;
    active: string;
    archived: string;
    workspaceVisibility: string;
    projectMembersVisibility: string;
  };
  api: {
    authenticationRequired: string;
    sessionExpired: string;
    invalidAgentCredential: string;
    missingAgentScope: string;
    ownerAccessRequired: string;
    workspaceNotFound: string;
    projectNotFound: string;
    taskNotFound: string;
    commentNotFound: string;
    missingRequiredField: string;
    missingRequiredFields: string;
    fileRequired: string;
    noTaskUpdatesProvided: string;
    taskUpdateFailed: string;
    taskCreationFailed: string;
    assigneeMustBelongToProject: string;
    disabledAgentsCannotBeAssigned: string;
    viewerMembersCannotOwnTasks: string;
    observerMembersCannotOwnTasks: string;
    parentTaskMustBelongToSameProject: string;
    taskCannotBeOwnParent: string;
    invalidAgentStatusTransition: string;
    invalidHumanStatusTransition: string;
    assignedAgentPermissionDenied: string;
    archivedProjectsCannotAcceptNewTasks: string;
    agentNotAllowedToComment: string;
    agentUploadNotAllowed: string;
    noEligibleAgentForExecution: string;
    agentNotAllowedToWriteExecutionLogs: string;
    onlyHumanCommentsEditable: string;
    agentCommentsCannotBeDeleted: string;
    workspaceNameRequired: string;
    workspaceSlugRequired: string;
    workspaceCreateFailed: string;
    projectAndTargetWorkspaceRequired: string;
    targetWorkspaceNotFound: string;
    chooseDifferentWorkspace: string;
    projectMoveFailed: string;
    agentNameAndScopesRequired: string;
    atLeastOneValidScopeRequired: string;
    agentMemberNotFound: string;
    constructorBaseUrlRequired: string;
    constructorSyncNotConfigured: string;
    constructorApiTokenRequired: string;
    constructorSyncFailed: string;
    createAnotherWorkspaceBeforeDeletingLast: string;
    workspaceDeleteFailed: string;
    enabledFlagRequired: string;
    credentialNotFound: string;
    attachmentNotFound: string;
    workspaceAssetNotFound: string;
    previewNotSupportedForFileType: string;
    searchQueryRequired: string;
    memberUpdatePatchRequired: string;
    memberUpdateNotAllowed: string;
    memberNotFound: string;
    constructorExecutionFailed: string;
    constructorExecutionTimedOut: string;
    constructorExecutionCanceled: string;
    constructorPollingApiTokenRequired: string;
    constructorUnreachable: string;
    constructorTaskLookupFailed: string;
    constructorDispatchDisabled: string;
    constructorDispatchApiTokenRequired: string;
    constructorTargetAgentRequired: string;
    constructorRejectedTask: string;
    constructorTaskAccepted: string;
    invalidCallbackPayload: string;
    callbackCommentWriteFailed: string;
    callbackCompletedWithoutResult: string;
    callbackFailedWithoutFinalAnswer: string;
    callbackTerminalWithoutFinalAnswer: string;
    unknownCommentAuthor: string;
    commentRoleFallback: string;
    constructorAuthor: string;
    agentRole: string;
    untitledTask: string;
  };
  workspaceUi: {
    context: string;
    focus: string;
    projectsEyebrow: string;
    tasksEyebrow: string;
    activity: string;
    recentChanges: string;
    needsAttention: string;
    openTasks: string;
    nothingNeedsAttentionYet: string;
    activeProjects: string;
    allProjects: string;
    noProjectsYet: string;
    visibleProjects: string;
    visibleProjectsDescription: string;
    createFirstProject: string;
    taskList: string;
    noTasksYet: string;
    createFirstTask: string;
    project: string;
    load: string;
    access: string;
    view: string;
    list: string;
    board: string;
    allStatuses: string;
    todo: string;
    inProgress: string;
    inReview: string;
    allTiming: string;
    dueSoon: string;
    overdue: string;
    dueDate: string;
    updated: string;
    created: string;
    clearFilters: string;
    allTags: string;
    kanbanBoard: string;
    agentIntegrationContract: string;
    focusSummary: string;
    timingSummary: string;
    tagSummary: string;
    sortSummary: string;
    onTrack: string;
    needsReview: string;
    atRisk: string;
  };
  taskWorkspace: {
    assignee: string;
    dueDate: string;
    labels: string;
    noLabels: string;
    taskDescription: string;
    noTaskDescriptionYet: string;
    discussion: string;
    commentsAndActivity: string;
    agentRun: string;
    quickActions: string;
    updateTask: string;
    attachments: string;
    support: string;
    watchers: string;
    contextInheritanceEnabled: string;
    edited: string;
    editComment: string;
    deleteComment: string;
    deleting: string;
    deleteCommentConfirm: string;
    commentsTab: string;
    activityTab: string;
    noCommentsYet: string;
    activityFeed: string;
    showLess: string;
    showFullAgentUpdate: string;
    addComment: string;
    editCommentTitle: string;
    saveChanges: string;
    editCommentPlaceholder: string;
    postUpdate: string;
    addCommentPlaceholder: string;
    writeCommentBeforePosting: string;
    commentUpdateFailed: string;
    commentPostFailed: string;
    commentUpdated: string;
    commentPosted: string;
    formattingHint: string;
    mentionHint: string;
    insertMentionAria: string;
    attachFile: string;
    cancel: string;
    saving: string;
    posting: string;
  };
  manageWorkspace: {
    directory: string;
    workspaceDirectory: string;
    workspaceDirectoryDescription: string;
    workspace: string;
    access: string;
    projects: string;
    members: string;
    action: string;
    current: string;
    open: string;
    active: string;
    archived: string;
    personal: string;
    shared: string;
    createWorkspace: string;
    name: string;
    newWorkspace: string;
    visibility: string;
    ownerWorkspace: string;
    sharedWorkspace: string;
    freshWorkspaceHint: string;
    creating: string;
    createWorkspaceAction: string;
    basics: string;
    manageWorkspaceTitle: string;
    workspaceSettings: string;
    workspaceSettingsDescription: string;
    contextTitle: string;
    contextSummary: string;
    contextBullets: string;
    workspaceSettingsHint: string;
    languageSettings: string;
    languageSettingsTitle: string;
    languageSettingsDescription: string;
    saving: string;
    saveWorkspace: string;
    overview: string;
    workspaceScope: string;
    workspaceScopeDescription: string;
    workspaceFiles: string;
    agentQueue: string;
    projectTransfer: string;
    moveProjectsToAnotherWorkspace: string;
    moveProjectsDescription: string;
    tasks: string;
    moveTo: string;
    selectTargetWorkspace: string;
    moving: string;
    move: string;
    noProjectsToMove: string;
    moveProjectsHint: string;
    operations: string;
    constructorAndAgentOperations: string;
    operationsDescription: string;
    whatBelongsHere: string;
    constructorEndpointAndToken: string;
    agentCredentialsAndAuthActivity: string;
    operationalSyncAndTroubleshooting: string;
    dangerZone: string;
    deleteThisWorkspace: string;
    deleteWorkspaceDescription: string;
    remainingHereNow: string;
    cannotDeleteLastWorkspace: string;
    typeToConfirm: string;
    actionCannotBeUndone: string;
    deleteWorkspaceAction: string;
    deletingWorkspace: string;
    workspaceNameRequired: string;
    workspaceUpdated: string;
    workspaceCouldNotBeUpdated: string;
    workspaceCreated: string;
    workspaceCouldNotBeCreated: string;
    chooseTargetWorkspaceFirst: string;
    projectCouldNotBeMoved: string;
    projectMoved: string;
    createAnotherWorkspaceBeforeDeletingLast: string;
    typeExactWorkspaceNameToConfirmDeletion: string;
    deleteWorkspaceConfirm: string;
    workspaceCouldNotBeDeleted: string;
    workspaceDeleted: string;
    projectCountLabel: string;
    projectCountLabelPlural: string;
    memberCountLabel: string;
    memberCountLabelPlural: string;
    workspaceFileCountLabel: string;
    workspaceFileCountLabelPlural: string;
  };
  globalSearch: {
    placeholder: string;
    searchShortcut: string;
    submitShortcut: string;
  };
  taskStatus: {
    agentWorkflow: string;
    humanWorkflow: string;
    agentReviewDescription: string;
    agentInProgressDescription: string;
    agentBlockedDescription: string;
    agentCurrentStateDescription: string;
    humanReviewDescription: string;
    humanBlockedDescription: string;
    humanCurrentStateDescription: string;
    updating: string;
    noFurtherTransitionsAvailable: string;
    blockedPendingFollowUp: string;
    transitionFailed: string;
    todo: string;
    inProgress: string;
    inReview: string;
    blocked: string;
    done: string;
  };
  agentRunHealth: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    completed: string;
    readyForReview: string;
    agentWorkCompleteUpdated: string;
    completedWaitingOnHumanUpdated: string;
    agentWorkComplete: string;
    completedWaitingOnHuman: string;
    waitingOnHuman: string;
    blockedNeedsHumanInput: string;
    inProgress: string;
    noFreshnessSignal: string;
    updatedJustNow: string;
    healthyRunLatestSignal: string;
    healthyRun: string;
    quietForMinutes: string;
    stillInProgressWorthChecking: string;
    mayBeStalled: string;
    noRecentProgressSince: string;
    noRecentProgress: string;
    readyToDispatch: string;
    idle: string;
    assignedNotDispatched: string;
    noActiveRun: string;
  };
  taskAttachments: {
    files: string;
    unknownAuthor: string;
    hidePreview: string;
    preview: string;
    downloadOnly: string;
    download: string;
    previewUnavailable: string;
    previewUnavailableDescription: string;
    noFilesTitle: string;
    noFilesDescription: string;
    uploadAsHuman: string;
    uploadAsAgent: string;
    reference: string;
    source: string;
    deliverable: string;
    output: string;
    fileSelected: string;
    agentUploadHint: string;
    localUploadHint: string;
    uploading: string;
    uploadFile: string;
    chooseFileBeforeUploading: string;
    attachmentUploadFailed: string;
    workspaceOwner: string;
  };
  constructorDispatch: {
    genericFailure: string;
    detailedFailure: string;
    dispatching: string;
    dispatchToAgent: string;
    taskUnderspecified: string;
    taskUnderspecifiedClearer: string;
    childTasks: string;
    recentComments: string;
    attachments: string;
    taskDetails: string;
    workspaceContext: string;
    projectContext: string;
    taskContext: string;
    effectiveContext: string;
    contextTitleLabel: string;
    contextSummaryLabel: string;
    currentMissionControlStatus: string;
    priorityLabel: string;
    assigneeLabel: string;
    reviewerLabel: string;
    projectLabel: string;
    projectSlugLabel: string;
    labelsLabel: string;
    startDateLabel: string;
    dueDateLabel: string;
    blockedReasonLabel: string;
    taskHintLabel: string;
    parentTaskLabel: string;
    principleLabel: string;
    constraintLabel: string;
    attachmentByline: string;
    commentByline: string;
    childTaskLine: string;
    instructionIntro: string;
    requestedDeliverable: string;
    taskTitle: string;
    untitledTask: string;
    executionRules: string;
    ruleNoDirectAccess: string;
    ruleNoSelfPosting: string;
    responseRequirements: string;
    responseReturnDeliverable: string;
    responseDirectComment: string;
    responseNoGenericDone: string;
    responseKeepAssumptionsBrief: string;
    responseSayWhatIsMissing: string;
  };
  commentFollowUpDispatch: {
    intro: string;
    originalTaskTitle: string;
    originalRequestedDeliverable: string;
    latestAgentDraft: string;
    recentTaskComments: string;
    latestHumanFollowUp: string;
    treatAsRevision: string;
    useOriginalGoal: string;
    replyWithDeliverable: string;
    missingInfoShort: string;
  };
  constructorPanel: {
    eyebrow: string;
    title: string;
    description: string;
    publicApiRequirements: string;
    requirementAgentsAndTasks: string;
    requirementApiToken: string;
    requirementCallbacks: string;
    instanceLabel: string;
    instancePlaceholder: string;
    baseUrl: string;
    baseUrlPlaceholder: string;
    baseUrlHelp: string;
    apiToken: string;
    apiTokenLabel: string;
    apiTokenHelp: string;
    createToken: string;
    hide: string;
    show: string;
    copy: string;
    copied: string;
    copyFailed: string;
    newApiTokenReady: string;
    newCallbackTokenReady: string;
    baseUrlRequired: string;
    apiTokenRequired: string;
    settingsSaveFailed: string;
    settingsSaved: string;
    syncFailed: string;
    syncedOneAgent: string;
    syncedManyAgents: string;
    savedTokenRetained: string;
    apiTokenPlaceholder: string;
    newTokenReady: string;
    savedTokenLoaded: string;
    environmentTokenInUse: string;
    noApiTokenSaved: string;
    apiTokenAvailable: string;
    apiTokenRequiredShort: string;
    callbackToken: string;
    callbackTokenLabel: string;
    callbackTokenHelp: string;
    callbackTokenWillBeRemoved: string;
    clear: string;
    savedCallbackTokenRetained: string;
    callbackTokenPlaceholder: string;
    newCallbackTokenReadyShort: string;
    callbackTokenClearedOnSave: string;
    savedCallbackTokenLoaded: string;
    callbackTokenNotConfigured: string;
    callbackTokenAvailable: string;
    noCallbackTokenConfigured: string;
    enableDispatch: string;
    apiTokenSaved: string;
    callbackTokenSaved: string;
    lastSync: string;
    status: string;
    yes: string;
    no: string;
    never: string;
    disabled: string;
    configured: string;
    notConfigured: string;
    savingAndRefreshing: string;
    syncingAndRefreshing: string;
    saveThenSyncHint: string;
    saving: string;
    saveSettings: string;
    syncing: string;
    syncAgents: string;
  };
  memberAgents: {
    agentStateUpdateFailed: string;
    saving: string;
    disableAgent: string;
    enableAgent: string;
    permissions: string;
    permissionComment: string;
    permissionChangeStatus: string;
    permissionLogExecution: string;
    permissionsUpdateFailed: string;
    workspaceBoundsHint: string;
    savePermissions: string;
  };
  workspaceRoleEditor: {
    roleCouldNotBeUpdated: string;
    workspaceRole: string;
    owner: string;
    admin: string;
    member: string;
    viewer: string;
    viewerHint: string;
  };
  workspaceAgentCredentials: {
    agentApi: string;
    credentials: string;
    noEnabledAgents: string;
    credentialName: string;
    tokensShownOnce: string;
    saving: string;
    createCredential: string;
    agentNameAndScopeRequired: string;
    creatingCredentialAndRefreshing: string;
    credentialCouldNotBeCreated: string;
    credentialCreatedCopyNow: string;
    newToken: string;
    credentialMeta: string;
    revoke: string;
    enable: string;
    enablingCredentialAndRefreshing: string;
    revokingCredentialAndRefreshing: string;
    credentialUpdateFailed: string;
    credentialEnabled: string;
    credentialRevoked: string;
    noCredentialsYet: string;
    noEnabledAgentsAvailable: string;
    authEvents: string;
    recentAccess: string;
    noAuthEventsYet: string;
  };
  workspaceAssets: {
    workspaceFiles: string;
    sharedDocuments: string;
    unknownAuthor: string;
    hidePreview: string;
    preview: string;
    downloadOnly: string;
    download: string;
    previewUnavailable: string;
    noSharedDocuments: string;
    noSharedDocumentsDescription: string;
    reference: string;
    policy: string;
    playbook: string;
    brief: string;
    fileSelected: string;
    workspaceScopeHint: string;
    uploading: string;
    uploadFile: string;
    chooseFileBeforeUploading: string;
    fileUploadFailed: string;
  };
  queuePage: {
    eyebrow: string;
    title: string;
    description: string;
    attentionNow: string;
    attentionNowDetail: string;
    running: string;
    runningDetail: string;
    readyToDispatch: string;
    readyToDispatchDetail: string;
    needsAttention: string;
    noAttentionDescription: string;
    nothingNeedsAttention: string;
    nothingNeedsAttentionDescription: string;
    runningNormally: string;
    runningNormallyDescription: string;
    readyToDispatchDescription: string;
    queueIsClear: string;
    queueClearWithTodo: string;
    queueClearWithoutWork: string;
    inReviewCount: string;
    blockedCount: string;
    staleCount: string;
    runningCount: string;
    readyToDispatchCount: string;
  };
  membersPage: {
    eyebrow: string;
    title: string;
    description: string;
    manageWorkspace: string;
  };
  myTasksPage: {
    eyebrow: string;
    title: string;
    description: string;
    visibleWork: string;
    groupedByStatus: string;
    visibleWorkDescription: string;
    nothingMatches: string;
    adjustFilters: string;
  };
  savedTaskViews: {
    promptName: string;
    views: string;
    save: string;
    remove: string;
    removeAria: string;
    title: string;
    description: string;
    saveCurrent: string;
    empty: string;
  };
  boardGridInteractive: {
    moveFailed: string;
    eyebrow: string;
    syncing: string;
    live: string;
    empty: string;
    due: string;
    subtasks: string;
    subtaskOf: string;
    drag: string;
  };
  memberDirectory: {
    directory: string;
    workspaceMembers: string;
    description: string;
    noMembersYet: string;
    noMembersDescription: string;
    manageWorkspace: string;
    member: string;
    type: string;
    load: string;
    projects: string;
    state: string;
    noProjects: string;
    enabled: string;
    disabled: string;
    human: string;
    agent: string;
  };
  taskWatchers: {
    title: string;
    description: string;
    updateFailed: string;
    count: string;
    saving: string;
    save: string;
  };
  projectsPage: {
    description: string;
    active: string;
    all: string;
    newProject: string;
    noProjects: string;
    noProjectsDescription: string;
    createFirstProject: string;
  };
  newProjectPage: {
    eyebrow: string;
    title: string;
    description: string;
  };
  taskEditPage: {
    eyebrow: string;
    editTaskTitle: string;
    description: string;
  };
  projectForms: {
    createEyebrow: string;
    createTitle: string;
    createDescription: string;
    projectName: string;
    projectNamePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    startDate: string;
    endDate: string;
    visibility: string;
    visibleToWorkspace: string;
    visibleToProjectMembersOnly: string;
    createHelper: string;
    savedToDefaultWorkspace: string;
    creating: string;
    createProject: string;
    projectNameRequired: string;
    projectCreateFailed: string;
    editEyebrow: string;
    editDescription: string;
    lifecycle: string;
    archived: string;
    changesSavedImmediately: string;
    saving: string;
    saveChanges: string;
    projectUpdateFailed: string;
    dangerZone: string;
    deleteProjectDescription: string;
    deleteProject: string;
    deleting: string;
    projectDeleteFailed: string;
    projectNameConfirmMismatch: string;
    governanceEyebrow: string;
    governanceTitle: string;
    governanceDescription: string;
    visibilityHint: string;
    lifecycleHint: string;
    governanceHelper: string;
    governanceIdleHint: string;
    saveSettings: string;
    governanceUpdateFailed: string;
    membersEyebrow: string;
    membersTitle: string;
    membersDescription: string;
    projectMembersUpdateFailed: string;
    observerHint: string;
    assignmentsHint: string;
    saveMembers: string;
    lead: string;
    member: string;
    observer: string;
    human: string;
    agent: string;
    projectAccess: string;
    editProject: string;
    addTask: string;
    projectTasks: string;
    memberScopeTitle: string;
    memberScopeDescription: string;
    editPageTitle: string;
    editPageDescription: string;
  };
  taskForms: {
    newTaskEyebrow: string;
    newTaskTitle: string;
    newTaskDescription: string;
    createEyebrow: string;
    createTitle: string;
    createDescription: string;
    title: string;
    titlePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    tags: string;
    tagsPlaceholder: string;
    status: string;
    todo: string;
    inProgress: string;
    inReview: string;
    blocked: string;
    done: string;
    priority: string;
    low: string;
    medium: string;
    high: string;
    urgent: string;
    assignee: string;
    unassigned: string;
    parentTask: string;
    noParentTask: string;
    startDate: string;
    dueDate: string;
    assigneeHint: string;
    defaultStatusHint: string;
    creating: string;
    createTask: string;
    taskTitleRequired: string;
    taskCreateFailed: string;
    editEyebrow: string;
    editTitle: string;
    editDescription: string;
    blockedReason: string;
    blockedReasonPlaceholder: string;
    statusHint: string;
    activityHint: string;
    saving: string;
    saveChanges: string;
    taskUpdateFailed: string;
    dangerZone: string;
    deleteTaskDescription: string;
    deleteTask: string;
    deleting: string;
    deleteTaskConfirm: string;
    taskDeleteFailed: string;
  };
  seededContext: {
    workspaceTitle: string;
    projectTitle: string;
    projectSummaryFallback: string;
    projectBulletKeepScope: string;
    projectBulletInheritContext: string;
  };
  signInHighlights: string[];

  agentDocsApi: {
    summary: string;
    auth: {
      owner: string;
      agent: string;
      notes: [string, string, string];
    };
    resources: {
      workspaceContextPurpose: string;
      projectContextPurpose: string;
      projectCreatePurpose: string;
      projectGovernanceReadPurpose: string;
      projectGovernanceUpdatePurpose: string;
      projectMembersReadPurpose: string;
      projectMembersUpdatePurpose: string;
      memberUpdatePurpose: string;
      constructorReadPurpose: string;
      constructorUpdatePurpose: string;
      constructorSyncPurpose: string;
      constructorDispatchPurpose: string;
      constructorStatusPurpose: string;
      constructorCallbackPurpose: string;
      agentCredentialsListPurpose: string;
      agentCredentialsCreatePurpose: string;
      agentCredentialUpdatePurpose: string;
      searchPurpose: string;
      taskCreatePurpose: string;
      taskReadPurpose: string;
      taskUpdatePurpose: string;
      taskWatchersReadPurpose: string;
      taskAttachmentsReadPurpose: string;
      taskAttachmentsCreatePurpose: string;
      attachmentDownloadPurpose: string;
      attachmentPreviewPurpose: string;
      taskWatchersUpdatePurpose: string;
      taskContextPurpose: string;
      taskCommentsReadPurpose: string;
      taskCommentsCreatePurpose: string;
      taskActivityPurpose: string;
      taskExecutionReadPurpose: string;
      taskExecutionCreatePurpose: string;
      docsReadPurpose: string;
      docsContractPurpose: string;
    };
    contract: {
      description: string;
      authentication: {
        owner: string;
        agent: string;
        notes: [string, string, string];
      };
      contextResolution: {
        notes: [string, string, string];
      };
      channels: {
        comments: string;
        activity: string;
        execution: string;
      };
      notes: {
        projectGovernanceVisibility: string;
        projectGovernanceStatus: string;
        projectMembersRoles: string;
        projectMembersObserver: string;
        constructorLinkReadReveal: string;
        constructorLinkKeepApiToken: string;
        constructorLinkKeepCallbackToken: string;
        constructorLinkUnsignedCallbacks: string;
        constructorSyncFetchAgents: string;
        constructorSyncSourceSystem: string;
        constructorDispatchOwnerOnly: string;
        constructorDispatchAgentSelection: string;
        constructorDispatchSourceOfTruth: string;
        constructorStatusTrackedExecution: string;
        constructorStatusDedupedLogs: string;
        constructorCallbackTerminal: string;
        constructorCallbackDeduped: string;
        memberUpdateRoles: string;
        memberUpdateAgentOnly: string;
        memberUpdatePermissions: string;
        agentCredentialsReturnsTokenOnce: string;
        agentCredentialsOwnerOnly: string;
        searchScope: string;
        taskCreateAssignees: string;
        taskCreateViewerObserver: string;
        taskCreateParentProject: string;
        taskAttachmentCreateActorTypes: string;
        taskAttachmentCreateEnabledAgent: string;
        taskAttachmentCreateOutputs: string;
        attachmentPreviewSupported: string;
        taskUpdateDisabledAgents: string;
        taskUpdateViewerRole: string;
        taskUpdateObserverRole: string;
        taskUpdateTransitionPolicies: string;
        taskUpdateAgentStatusModel: string;
        taskUpdateAgentPermission: string;
        taskUpdateDoneSummary: string;
        taskWatchersUpdateMeaning: string;
        taskAttachmentUploadStorage: string;
        taskAttachmentUploadEnabledAgent: string;
        taskCommentCreatePermission: string;
        taskCommentCreateMentions: string;
        taskCommentUpdateHumanOnly: string;
        taskExecutionAppendPermission: string;
      };
    };
  };

  agentDocsPage: {
    eyebrow: string;
    title: string;
    description: string;
    readJsonSummary: string;
    exportContract: string;
    workspaceContextTitle: string;
    apiShapeEyebrow: string;
    implementedResourcesTitle: string;
    implementedResourcesDescription: string;
    examplesEyebrow: string;
    samplePayloadsTitle: string;
    samplePayloadsDescription: string;
    resolutionModelEyebrow: string;
    howTasksFindContextTitle: string;
    howTasksFindContextDescription: string;
    exportsEyebrow: string;
    machineReadableOutputsTitle: string;
    machineReadableOutputsDescription: string;
    implementedResources: { title: string; body: string }[];
    samplePayloads: { title: string; code: string }[];
    workspaceContextBlock: { title: string; summary: string; bullets: string[] };
    resolutionSections: { title: string; summary: string; bullets: string[] }[];
    exportItems: { title: string; body: string }[];
  };
};

export const en: Messages = {
  common: {
    localeName: 'English',
    language: 'Language',
    english: 'English',
    french: 'French',
    workspace: 'Workspace',
    status: 'Status',
    priority: 'Priority',
    owner: 'Owner',
    due: 'Due',
    active: 'Active',
    tags: 'Tags',
    sort: 'Sort',
    open: 'Open',
    review: 'Review',
    blocked: 'Blocked',
    members: 'members',
    complete: 'complete',
    subtask: 'Subtask',
    subtasks: 'subtasks',
    noActivityYet: 'No activity yet.'
  },
  metadata: {
    title: 'Mission Control',
    description: 'A task system for human and AI-agent collaboration.'
  },
  shell: {
    brandTitle: 'Mission Control',
    brandSubtitle: 'Workspace operations',
    workspaceLabel: 'Workspace',
    navigationLabel: 'Navigation',
    secondaryLabel: 'Secondary',
    signOut: 'Sign out',
    signingOut: 'Signing out...',
    versionLabel: 'Version',
    commitLabel: 'Commit',
    languageLabel: 'Language'
  },
  nav: {
    projects: 'Projects',
    myTasks: 'My Tasks',
    members: 'Members',
    settings: 'Settings',
    queue: 'Queue',
    signIn: 'Sign In'
  },
  auth: {
    missionControl: 'Mission Control',
    heroTitle: 'Serious task orchestration for humans and agents.',
    heroBody: 'A premium operational workspace for project work, execution visibility, and collaboration that stays calm under load.',
    ownerAccessEyebrow: 'Owner access',
    signInTitle: 'Sign in',
    signInBody: 'Access your workspace, project queue, and execution review surfaces.',
    continueToPath: 'Sign in to continue to {path}.',
    sessionExpired: 'Your session expired. Sign in again to continue.',
    emailLabel: 'Email',
    emailPlaceholder: 'owner@mission-control.app',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    rememberDevice: 'Remember this device',
    environmentAccess: 'Managed owner access',
    submit: 'Continue to workspace',
    submitting: 'Signing in...',
    localOwnerAccess: 'Owner access is configured for this deployment.',
    dockerWorkflow: 'Production deployment',
    defaultError: 'Sign-in failed. Please try again.',
    missingCredentials: 'Email and password are required.',
    invalidCredentials: 'The email or password is incorrect.'
  },
  authAudit: {
    ownerSignedIn: 'Owner signed in',
    ownerSignedInRemember: 'Owner signed in with remember-device enabled',
    ownerSignedOut: 'Owner signed out'
  },
  taskServer: {
    noDate: 'No date',
    justNow: 'Just now',
    minutesAgo: '{count}m ago',
    hoursAgo: '{count}h ago',
    daysAgo: '{count}d ago',
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
    never: 'Never',
    unassigned: 'Unassigned',
    workspaceOwner: 'Workspace Owner',
    systemActor: 'System',
    credentialEnabled: 'Enabled credential',
    credentialRevoked: 'Revoked credential',
    credentialFor: 'for',
    commentAdded: 'Comment added',
    commentEdited: 'Comment edited',
    commentDeleted: 'Comment deleted',
    agentCommentDetail: 'Agent {author} wrote a comment',
    userCommentDetail: 'User {author} wrote a comment',
    userCommentEditedDetail: 'User {authorName} edited a comment',
    userCommentDeletedDetail: 'User {authorName} deleted a comment',
    attachmentAdded: 'Attachment added',
    attachmentUploadDetail: '{author} uploaded {fileName}',
    permissionDenied: 'Permission denied',
    transitionActions: {
      startWork: 'Start work',
      markBlocked: 'Mark blocked',
      markDone: 'Mark done',
      moveToReview: 'Move to review',
      moveBackToTodo: 'Move back to todo',
      resumeWork: 'Resume work',
      approveDone: 'Approve done',
      moveToTodo: 'Move to todo',
      closeAsDone: 'Close as done',
      reopenTask: 'Reopen task',
      startExecution: 'Start execution'
    },
    execution: {
      constructorDispatchAccepted: 'Constructor dispatch accepted',
      constructorDispatchFailed: 'Constructor dispatch failed',
      constructorStatusUpdated: 'Constructor status updated',
      constructorCallbackReceived: 'Constructor callback received',
      constructorCallbackDuplicateIgnored: 'Constructor callback duplicate ignored',
      taskDispatched: 'Task dispatched',
      agentAcceptedTask: 'Agent accepted task',
      agentRetrievedContext: 'Agent retrieved context',
      agentFinishedTask: 'Agent finished task',
      agentBlocked: 'Agent blocked',
      updated: 'Execution updated'
    }
  },
  membersServer: {
    owner: 'Owner',
    admin: 'Admin',
    viewer: 'Viewer',
    member: 'Member',
    lead: 'Lead',
    observer: 'Observer',
    agent: 'Agent',
    human: 'Human',
    disabled: 'Disabled',
    activeTasks: '{count} active tasks',
    workspaceRoleChanged: 'Workspace role changed',
    becameViewerRemovedFromOwnership: '{memberName} became a viewer and was removed from task ownership on {taskTitle}.',
    becameViewerRemovedFromReview: '{memberName} became a viewer and was removed from review on {taskTitle}.',
    agentDisabled: 'Agent disabled',
    agentDisabledRemovedFromAssignment: '{memberName} was disabled and removed from assignment on {taskTitle}.',
    agentDisabledRemovedFromReview: '{memberName} was disabled and removed from review on {taskTitle}.'
  },
  projectsServer: {
    atRisk: 'At risk',
    needsReview: 'Needs review',
    onTrack: 'On track',
    active: 'Active',
    archived: 'Archived',
    workspaceVisibility: 'Workspace',
    projectMembersVisibility: 'Project members'
  },
  api: {
    authenticationRequired: 'Authentication required.',
    sessionExpired: 'Session expired.',
    invalidAgentCredential: 'Agent credential is invalid.',
    missingAgentScope: 'Agent credential does not have the required scope.',
    ownerAccessRequired: 'Owner access required.',
    workspaceNotFound: 'Workspace not found',
    projectNotFound: 'Project not found',
    taskNotFound: 'Task not found',
    commentNotFound: 'Comment not found',
    missingRequiredField: 'Missing required field',
    missingRequiredFields: 'Missing required fields',
    fileRequired: 'A file is required',
    noTaskUpdatesProvided: 'No task updates were provided',
    taskUpdateFailed: 'Task update failed',
    taskCreationFailed: 'Task creation failed',
    assigneeMustBelongToProject: 'Assignee must belong to the project',
    disabledAgentsCannotBeAssigned: 'Disabled agents cannot be assigned',
    viewerMembersCannotOwnTasks: 'Viewer members cannot own tasks',
    observerMembersCannotOwnTasks: 'Observer project members cannot own tasks',
    parentTaskMustBelongToSameProject: 'Parent task must belong to the same project',
    taskCannotBeOwnParent: 'A task cannot be its own parent',
    invalidAgentStatusTransition: 'This transition is not allowed for agent-owned work',
    invalidHumanStatusTransition: 'This transition is not allowed for human operators',
    assignedAgentPermissionDenied: 'The assigned agent does not have permission for this task action',
    archivedProjectsCannotAcceptNewTasks: 'Archived projects cannot accept new tasks',
    agentNotAllowedToComment: 'This agent is not allowed to comment.',
    agentUploadNotAllowed: 'Agent upload is not allowed for this actor.',
    noEligibleAgentForExecution: 'No eligible agent available for execution',
    agentNotAllowedToWriteExecutionLogs: 'This agent is not allowed to write execution logs.',
    onlyHumanCommentsEditable: 'Only human comments can be edited in this version.',
    agentCommentsCannotBeDeleted: 'Agent comments cannot be deleted.',
    workspaceNameRequired: 'Workspace name is required.',
    workspaceSlugRequired: 'Workspace slug is required.',
    workspaceCreateFailed: 'Workspace could not be created.',
    projectAndTargetWorkspaceRequired: 'Project and target workspace are required.',
    targetWorkspaceNotFound: 'Target workspace not found.',
    chooseDifferentWorkspace: 'Choose a different workspace.',
    projectMoveFailed: 'Project move failed.',
    agentNameAndScopesRequired: 'Agent, name, and scopes are required.',
    atLeastOneValidScopeRequired: 'At least one valid scope is required.',
    agentMemberNotFound: 'Agent member not found.',
    constructorBaseUrlRequired: 'Constructor base URL is required.',
    constructorSyncNotConfigured: 'Constructor agent sync is not configured for this workspace.',
    constructorApiTokenRequired: 'Constructor API token is required before syncing agents.',
    constructorSyncFailed: 'Constructor agent sync failed.',
    createAnotherWorkspaceBeforeDeletingLast: 'Create another workspace before deleting the last one.',
    workspaceDeleteFailed: 'Workspace delete failed.',
    enabledFlagRequired: 'Enabled flag is required.',
    credentialNotFound: 'Credential not found.',
    attachmentNotFound: 'Attachment not found',
    workspaceAssetNotFound: 'Workspace asset not found',
    previewNotSupportedForFileType: 'Preview is not supported for this file type.',
    searchQueryRequired: 'Search query is required',
    memberUpdatePatchRequired: 'Enabled flag, workspaceRole, or agentPermissions is required.',
    memberUpdateNotAllowed: 'This member update is not allowed.',
    memberNotFound: 'Member not found',
    constructorExecutionFailed: 'Constructor execution failed.',
    constructorExecutionTimedOut: 'Constructor execution timed out.',
    constructorExecutionCanceled: 'Constructor execution was canceled.',
    constructorPollingApiTokenRequired: 'Constructor API token is required before polling task status.',
    constructorUnreachable: 'Constructor is unreachable.',
    constructorTaskLookupFailed: 'Constructor task lookup failed.',
    constructorDispatchDisabled: 'Constructor dispatch is disabled for this workspace.',
    constructorDispatchApiTokenRequired: 'Constructor API token is required before dispatch.',
    constructorTargetAgentRequired: 'Assign the task to a Constructor agent or sync a default Constructor agent before dispatch.',
    constructorRejectedTask: 'Constructor rejected the task.',
    constructorTaskAccepted: 'Task accepted by Constructor. Mission Control will post the final answer to task comments after the callback arrives.',
    invalidCallbackPayload: 'Invalid callback payload',
    callbackCommentWriteFailed: 'Failed to write callback comment',
    callbackCompletedWithoutResult: 'Task completed, but no result text was included in the callback payload.',
    callbackFailedWithoutFinalAnswer: 'The execution failed before a final answer was returned.',
    callbackTerminalWithoutFinalAnswer: 'Constructor sent a terminal update without a final answer.',
    unknownCommentAuthor: 'Unknown',
    commentRoleFallback: 'Comment',
    constructorAuthor: 'Constructor',
    agentRole: 'Agent',
    untitledTask: 'Untitled task'
  },
  workspaceUi: {
    context: 'Context',
    focus: 'Focus',
    projectsEyebrow: 'Projects',
    tasksEyebrow: 'Tasks',
    activity: 'Activity',
    recentChanges: 'Recent changes',
    needsAttention: 'Needs attention',
    openTasks: 'Open tasks',
    nothingNeedsAttentionYet: 'Nothing needs attention yet.',
    activeProjects: 'Active projects',
    allProjects: 'All projects',
    noProjectsYet: 'No projects yet.',
    visibleProjects: 'Visible projects',
    visibleProjectsDescription: 'Compact project list with status, task load, visibility, and due date.',
    createFirstProject: 'Create the first project when you are ready to organize work.',
    taskList: 'Task list',
    noTasksYet: 'No tasks yet',
    createFirstTask: 'Create the first task to start tracking work.',
    project: 'Project',
    load: 'Load',
    access: 'Access',
    view: 'View',
    list: 'List',
    board: 'Board',
    allStatuses: 'All statuses',
    todo: 'Todo',
    inProgress: 'In progress',
    inReview: 'In review',
    allTiming: 'All timing',
    dueSoon: 'Due soon',
    overdue: 'Overdue',
    dueDate: 'Due date',
    updated: 'Updated',
    created: 'Created',
    clearFilters: 'Clear filters',
    allTags: 'All tags',
    kanbanBoard: 'Kanban board',
    agentIntegrationContract: 'Agent integration contract',
    focusSummary: 'Status: {value}',
    timingSummary: 'Timing: {value}',
    tagSummary: 'Tag: {value}',
    sortSummary: 'Sort: {value}',
    onTrack: 'On track',
    needsReview: 'Needs review',
    atRisk: 'At risk'
  },
  taskWorkspace: {
    assignee: 'Assignee',
    dueDate: 'Due date',
    labels: 'Labels',
    noLabels: 'No labels',
    taskDescription: 'Task description',
    noTaskDescriptionYet: 'No task description yet.',
    discussion: 'Discussion',
    commentsAndActivity: 'Comments and activity',
    agentRun: 'Agent run',
    quickActions: 'Quick actions',
    updateTask: 'Update task',
    attachments: 'Attachments',
    support: 'Support',
    watchers: 'Watchers',
    contextInheritanceEnabled: 'Context inheritance is enabled for this task.',
    edited: 'Edited',
    editComment: 'Edit comment',
    deleteComment: 'Delete',
    deleting: 'Deleting...',
    deleteCommentConfirm: 'Delete this comment? This cannot be undone.',
    commentsTab: 'Comments ({count})',
    activityTab: 'Activity ({count})',
    noCommentsYet: 'No comments yet.',
    activityFeed: 'Activity feed',
    showLess: 'Show less',
    showFullAgentUpdate: 'Show full agent update',
    addComment: 'Add comment',
    editCommentTitle: 'Edit comment',
    saveChanges: 'Save changes',
    editCommentPlaceholder: 'Refine the comment without changing the task history model.',
    postUpdate: 'Post update',
    addCommentPlaceholder: 'Write an update, request input, or summarize progress.',
    writeCommentBeforePosting: 'Write a comment before posting.',
    commentUpdateFailed: 'Comment could not be updated.',
    commentPostFailed: 'Comment could not be posted.',
    commentUpdated: 'Comment updated.',
    commentPosted: 'Comment posted.',
    formattingHint: 'Supports **bold**, _italic_, `code`, lists, links, and @mentions',
    mentionHint: 'Tap a teammate to insert a mention.',
    insertMentionAria: 'Insert mention for {name}',
    attachFile: 'Attach file',
    cancel: 'Cancel',
    saving: 'Saving...',
    posting: 'Posting...'
  },
  manageWorkspace: {
    directory: 'Directory',
    workspaceDirectory: 'Workspace directory',
    workspaceDirectoryDescription: 'Create another workspace, switch into it, or review workspace counts.',
    workspace: 'Workspace',
    access: 'Access',
    projects: 'Projects',
    members: 'Members',
    action: 'Action',
    current: 'Current',
    open: 'Open',
    active: 'Active',
    archived: 'Archived',
    personal: 'Personal',
    shared: 'Shared',
    createWorkspace: 'Create workspace',
    name: 'Name',
    newWorkspace: 'New workspace',
    visibility: 'Visibility',
    ownerWorkspace: 'Owner workspace',
    sharedWorkspace: 'Shared workspace',
    freshWorkspaceHint: 'A fresh workspace gets its own owner membership and empty context.',
    creating: 'Creating...',
    createWorkspaceAction: 'Create workspace',
    basics: 'Basics',
    manageWorkspaceTitle: 'Manage workspace',
    workspaceSettings: 'Workspace settings',
    workspaceSettingsDescription: 'Name, visibility, and shared context.',
    contextTitle: 'Context title',
    contextSummary: 'Context summary',
    contextBullets: 'Context bullets',
    workspaceSettingsHint: 'Workspace settings',
    languageSettings: 'Language',
    languageSettingsTitle: 'Display language',
    languageSettingsDescription: 'Choose the interface language for this browser so you can preview translated product surfaces.',
    saving: 'Saving...',
    saveWorkspace: 'Save workspace',
    overview: 'Overview',
    workspaceScope: 'Workspace scope',
    workspaceScopeDescription: 'A compact snapshot of the current workspace.',
    workspaceFiles: 'Workspace files',
    agentQueue: 'Agent queue',
    projectTransfer: 'Project transfer',
    moveProjectsToAnotherWorkspace: 'Move projects to another workspace',
    moveProjectsDescription: 'Use this before deleting a workspace when some projects should survive. Tasks stay with the project, while old assignments are cleared to avoid cross-workspace member links.',
    tasks: 'Tasks',
    moveTo: 'Move to',
    selectTargetWorkspace: 'Select target workspace',
    moving: 'Moving...',
    move: 'Move',
    noProjectsToMove: 'This workspace has no projects to move.',
    moveProjectsHint: 'Move projects one by one into another workspace.',
    operations: 'Operations',
    constructorAndAgentOperations: 'Constructor and agent operations',
    operationsDescription: 'These controls support Constructor connectivity and agent API access. They are operational integrations, not basic workspace profile settings.',
    whatBelongsHere: 'What belongs here',
    constructorEndpointAndToken: 'Constructor endpoint and token configuration',
    agentCredentialsAndAuthActivity: 'Agent API credentials and recent auth activity',
    operationalSyncAndTroubleshooting: 'Operational sync and integration troubleshooting',
    dangerZone: 'Danger zone',
    deleteThisWorkspace: 'Delete this workspace',
    deleteWorkspaceDescription: 'Deleting a workspace permanently deletes its remaining projects, tasks, files, memberships, and Constructor integration. Move projects first if you want to keep them.',
    remainingHereNow: 'Remaining here right now: {projects} {projectLabel}, {members} {memberLabel}, and {files} {fileLabel}.',
    cannotDeleteLastWorkspace: 'You cannot delete the last remaining workspace.',
    typeToConfirm: 'Type {name} to confirm',
    actionCannotBeUndone: 'This action cannot be undone.',
    deleteWorkspaceAction: 'Delete workspace',
    deletingWorkspace: 'Deleting...',
    workspaceNameRequired: 'Workspace name is required.',
    workspaceUpdated: 'Saved',
    workspaceCouldNotBeUpdated: 'Workspace could not be updated.',
    workspaceCreated: 'Created {name}.',
    workspaceCouldNotBeCreated: 'Workspace could not be created.',
    chooseTargetWorkspaceFirst: 'Choose a target workspace first.',
    projectCouldNotBeMoved: 'Project could not be moved.',
    projectMoved: 'Moved {project} to {workspace}.',
    createAnotherWorkspaceBeforeDeletingLast: 'Create another workspace before deleting the last one.',
    typeExactWorkspaceNameToConfirmDeletion: 'Type the exact workspace name to confirm deletion.',
    deleteWorkspaceConfirm: 'Delete {name}? This will permanently delete its remaining projects, tasks, files, memberships, and Constructor settings.',
    workspaceCouldNotBeDeleted: 'Workspace could not be deleted.',
    workspaceDeleted: 'Deleted {name}.',
    projectCountLabel: 'project',
    projectCountLabelPlural: 'projects',
    memberCountLabel: 'member',
    memberCountLabelPlural: 'members',
    workspaceFileCountLabel: 'workspace file',
    workspaceFileCountLabelPlural: 'workspace files'
  },
  globalSearch: {
    placeholder: 'Search tasks and projects',
    searchShortcut: '/',
    submitShortcut: 'Enter'
  },
  taskStatus: {
    agentWorkflow: 'Agent workflow',
    humanWorkflow: 'Human workflow',
    agentReviewDescription: 'The run is finished. Keep the next step human: approve it, send it back for another pass, or mark it blocked if the outcome is incomplete.',
    agentInProgressDescription: 'The run is active. Only intervene if you need to add context, redirect the work, or mark a blocker.',
    agentBlockedDescription: 'The run is blocked. Add the missing context or move the task into the state that best reflects the next safe step.',
    agentCurrentStateDescription: 'Current state: {status}. Use the constrained workflow below to keep agent execution predictable.',
    humanReviewDescription: 'A decision is needed now. Approve the result, request changes, or move it into a clearer human-owned state.',
    humanBlockedDescription: 'Resolve the blocker first, then move the task forward deliberately.',
    humanCurrentStateDescription: 'Current state: {status}. Human operators can move work intentionally without bypassing the shared workflow model.',
    updating: 'Updating...',
    noFurtherTransitionsAvailable: 'No further transitions available.',
    blockedPendingFollowUp: 'Blocked pending follow-up.',
    transitionFailed: 'Status transition failed.',
    todo: 'Todo',
    inProgress: 'In Progress',
    inReview: 'In Review',
    blocked: 'Blocked',
    done: 'Done'
  },
  agentRunHealth: {
    justNow: 'just now',
    minutesAgo: '{count}m ago',
    hoursAgo: '{count}h ago',
    daysAgo: '{count}d ago',
    completed: 'Completed',
    readyForReview: 'Ready for review',
    agentWorkCompleteUpdated: 'Agent work is complete · updated {distance}',
    completedWaitingOnHumanUpdated: 'Completed and waiting on human · updated {distance}',
    agentWorkComplete: 'Agent work is complete',
    completedWaitingOnHuman: 'Completed and waiting on human',
    waitingOnHuman: 'Waiting on human',
    blockedNeedsHumanInput: 'Blocked and needs human input before the run can continue.',
    inProgress: 'In progress',
    noFreshnessSignal: 'Run is active, but no freshness signal is available yet.',
    updatedJustNow: 'Updated just now',
    healthyRunLatestSignal: 'Healthy run · latest signal {distance}',
    healthyRun: 'Healthy run',
    quietForMinutes: 'Quiet for {count}m',
    stillInProgressWorthChecking: 'Still in progress, but worth a quick check if more silence continues.',
    mayBeStalled: 'May be stalled',
    noRecentProgressSince: 'No recent progress signal since {distance}.',
    noRecentProgress: 'No recent progress signal.',
    readyToDispatch: 'Ready to dispatch',
    idle: 'Idle',
    assignedNotDispatched: 'This task is assigned to an agent but has not been dispatched yet.',
    noActiveRun: 'No active agent run.'
  },
  taskAttachments: {
    files: 'Files',
    unknownAuthor: 'Unknown author',
    hidePreview: 'Hide preview',
    preview: 'Preview',
    downloadOnly: 'Download only',
    download: 'Download',
    previewUnavailable: 'Preview is unavailable for this format. Download the file to inspect it.',
    previewUnavailableDescription: 'Preview is unavailable for this format. Download the file to inspect it.',
    noFilesTitle: 'No files on this task',
    noFilesDescription: 'Upload references, deliverables, or outputs here so work stays attached to the task.',
    uploadAsHuman: 'Upload as human',
    uploadAsAgent: 'Upload as {name}',
    reference: 'Reference',
    source: 'Source',
    deliverable: 'Deliverable',
    output: 'Output',
    fileSelected: '{name} selected',
    agentUploadHint: 'Agent-attributed uploads are stored like any other task artifact.',
    localUploadHint: 'Upload stays on the Docker-local app filesystem.',
    uploading: 'Uploading...',
    uploadFile: 'Upload file',
    chooseFileBeforeUploading: 'Choose a file before uploading.',
    attachmentUploadFailed: 'Attachment upload failed.',
    workspaceOwner: 'Workspace Owner'
  },
  constructorDispatch: {
    genericFailure: 'Dispatch failed.',
    detailedFailure: 'Dispatch failed. Check the task description and Constructor connection, then try again.',
    dispatching: 'Dispatching...',
    dispatchToAgent: 'Dispatch to agent',
    taskUnderspecified: 'Add a task description before dispatch. Include the requested deliverable, key constraints, and any source material or context the agent should use.',
    taskUnderspecifiedClearer: 'Add a clearer task description before dispatch. State the requested deliverable, the important constraints, and any source material or context the agent should use.',
    childTasks: 'Child tasks',
    recentComments: 'Recent comments',
    attachments: 'Attachments',
    taskDetails: 'Task details',
    workspaceContext: 'Workspace context',
    projectContext: 'Project context',
    taskContext: 'Task context',
    effectiveContext: 'Effective context',
    contextTitleLabel: 'Title: {value}',
    contextSummaryLabel: 'Summary: {value}',
    currentMissionControlStatus: 'Current Mission Control status: {value}',
    priorityLabel: 'Priority: {value}',
    assigneeLabel: 'Assignee: {value}',
    reviewerLabel: 'Reviewer: {value}',
    projectLabel: 'Project: {value}',
    projectSlugLabel: 'Project slug: {value}',
    labelsLabel: 'Labels: {value}',
    startDateLabel: 'Start date: {value}',
    dueDateLabel: 'Due date: {value}',
    blockedReasonLabel: 'Blocked reason: {value}',
    taskHintLabel: 'Task hint: {value}',
    parentTaskLabel: 'Parent task: {value}',
    principleLabel: 'Principle: {value}',
    constraintLabel: 'Constraint: {value}',
    attachmentByline: '{name} ({artifactType}) by {author}',
    commentByline: '{author} ({role}): {body}',
    childTaskLine: '{id}: {title} ({status})',
    instructionIntro: 'You are working on a Mission Control task.',
    requestedDeliverable: 'Requested deliverable:\n{value}',
    taskTitle: 'Task title: {value}',
    untitledTask: 'Untitled task',
    executionRules: 'Execution rules:',
    ruleNoDirectAccess: 'Do not attempt to access Mission Control directly.',
    ruleNoSelfPosting: 'Do not inspect the app or post comments yourself.',
    responseRequirements: 'Response requirements:',
    responseReturnDeliverable: 'Return the actual deliverable or answer requested above.',
    responseDirectComment: 'Write it so Mission Control can post it directly as a task comment.',
    responseNoGenericDone: 'Do not reply with a generic acknowledgement like "Done" unless the task explicitly asks for that.',
    responseKeepAssumptionsBrief: 'Keep assumptions brief and include them only when they materially affect the result.',
    responseSayWhatIsMissing: 'If the request still cannot be completed from the supplied information, say exactly what is missing.'
  },
  commentFollowUpDispatch: {
    intro: 'You are continuing an existing Mission Control task after a new human follow-up comment.',
    originalTaskTitle: 'Original task title: {value}',
    originalRequestedDeliverable: 'Original requested deliverable:\n{value}',
    latestAgentDraft: 'Latest agent draft/output to revise:\n{value}',
    recentTaskComments: 'Recent task comments:\n{value}',
    latestHumanFollowUp: 'Latest human follow-up from {author}:\n{value}',
    treatAsRevision: 'Treat the human comment as feedback or a revision request on the existing task, not as a brand new blank request.',
    useOriginalGoal: 'Use the original task goal and the latest draft/output above to produce the revised final answer directly.',
    replyWithDeliverable: 'Reply with the improved deliverable itself so Mission Control can post it as the next task comment.',
    missingInfoShort: 'If something important is genuinely missing, say exactly what is missing in one short sentence.'
  },
  constructorPanel: {
    eyebrow: 'Constructor',
    title: 'Execution link',
    description: 'Configure the Constructor public API endpoint Mission Control uses for agent sync, task dispatch, and callbacks.',
    publicApiRequirements: 'Public API requirements',
    requirementAgentsAndTasks: 'Mission Control calls GET /api/v1/agents and POST /api/v1/tasks on the configured Constructor base URL.',
    requirementApiToken: 'An API token is required for every public API request. Generate it here, save it, then set the same value in Constructor as CONSTRUCTOR_API_TOKEN.',
    requirementCallbacks: 'Callbacks return to Mission Control at /api/tasks/:taskId/constructor/callback. Constructor currently does not sign callbacks, so callback delivery depends only on the URL being reachable and returning a 2xx response.',
    instanceLabel: 'Instance label',
    instancePlaceholder: 'Primary Constructor',
    baseUrl: 'Base URL',
    baseUrlPlaceholder: 'http://127.0.0.1:8787 or http://127.0.0.1:8787/api/v1',
    baseUrlHelp: 'Required. Mission Control accepts either the Constructor root URL or a URL already ending in /api/v1.',
    apiToken: 'API token',
    apiTokenLabel: 'API token',
    apiTokenHelp: 'Required bearer token for Constructor public API requests.',
    createToken: 'Create token',
    hide: 'Hide',
    show: 'Show',
    copy: 'Copy',
    copied: '{label} copied.',
    copyFailed: 'Could not copy {label}.',
    newApiTokenReady: 'New Constructor API token ready. Save settings, then paste the same value into Constructor as CONSTRUCTOR_API_TOKEN.',
    newCallbackTokenReady: 'New Constructor callback token ready. Save settings before testing callbacks.',
    baseUrlRequired: 'Constructor base URL is required.',
    apiTokenRequired: 'Constructor API token is required. Create one here or paste the token already configured in Constructor.',
    settingsSaveFailed: 'Constructor settings could not be saved.',
    settingsSaved: 'Constructor settings saved.',
    syncFailed: 'Constructor agent sync failed.',
    syncedOneAgent: 'Synced 1 Constructor agent.',
    syncedManyAgents: 'Synced {count} Constructor agents.',
    savedTokenRetained: 'Saved token retained unless you replace it here',
    apiTokenPlaceholder: 'Constructor public API bearer token',
    newTokenReady: 'New token ready to save.',
    savedTokenLoaded: 'Saved token is loaded from workspace settings and will stay in place until you replace it.',
    environmentTokenInUse: 'Constructor is using an environment token. Save a workspace token here if you want to reopen it later.',
    noApiTokenSaved: 'No API token saved yet.',
    apiTokenAvailable: 'API token available',
    apiTokenRequiredShort: 'API token required',
    callbackToken: 'Callback token',
    callbackTokenLabel: 'Callback token',
    callbackTokenHelp: 'Saved for future use, but not enforced by the current Constructor public API because callbacks are unsigned.',
    callbackTokenWillBeRemoved: 'Callback token will be removed the next time you save Constructor settings.',
    clear: 'Clear',
    savedCallbackTokenRetained: 'Saved callback token retained unless you replace or clear it',
    callbackTokenPlaceholder: 'Optional callback shared secret',
    newCallbackTokenReadyShort: 'New callback token ready to save.',
    callbackTokenClearedOnSave: 'Callback token will be cleared on save.',
    savedCallbackTokenLoaded: 'Saved callback token is loaded from workspace settings and will stay in place until you replace or clear it.',
    callbackTokenNotConfigured: 'Callback token not configured.',
    callbackTokenAvailable: 'Callback token available',
    noCallbackTokenConfigured: 'No callback token configured',
    enableDispatch: 'Enable Constructor dispatch for this workspace',
    apiTokenSaved: 'API token saved',
    callbackTokenSaved: 'Callback token saved',
    lastSync: 'Last sync',
    status: 'Status',
    yes: 'Yes',
    no: 'No',
    never: 'Never',
    disabled: 'Disabled',
    configured: 'Configured',
    notConfigured: 'Not configured',
    savingAndRefreshing: 'Saving Constructor settings and refreshing workspace settings…',
    syncingAndRefreshing: 'Syncing available Constructor agents and refreshing the member list…',
    saveThenSyncHint: 'Save the base URL and API token first, then sync agents from Constructor before dispatch testing.',
    saving: 'Saving...',
    saveSettings: 'Save Constructor settings',
    syncing: 'Syncing...',
    syncAgents: 'Sync agents'
  },
  memberAgents: {
    agentStateUpdateFailed: 'Agent state could not be updated.',
    saving: 'Saving...',
    disableAgent: 'Disable agent',
    enableAgent: 'Enable agent',
    permissions: 'Permissions',
    permissionComment: 'Comment',
    permissionChangeStatus: 'Change status',
    permissionLogExecution: 'Log execution',
    permissionsUpdateFailed: 'Permissions could not be updated.',
    workspaceBoundsHint: 'Workspace-level bounds for agent actions.',
    savePermissions: 'Save permissions'
  },
  workspaceRoleEditor: {
    roleCouldNotBeUpdated: 'Workspace role could not be updated.',
    workspaceRole: 'Workspace role',
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
    viewerHint: 'Viewers can see workspace information but cannot change operational settings.'
  },
  workspaceAgentCredentials: {
    agentApi: 'Agent API',
    credentials: 'Credentials',
    noEnabledAgents: 'No enabled agents',
    credentialName: 'Credential name',
    tokensShownOnce: 'New tokens are shown once. Copy them before leaving this page.',
    saving: 'Saving...',
    createCredential: 'Create credential',
    agentNameAndScopeRequired: 'Agent, credential name, and at least one scope are required.',
    creatingCredentialAndRefreshing: 'Creating credential and refreshing workspace settings...',
    credentialCouldNotBeCreated: 'Credential could not be created.',
    credentialCreatedCopyNow: 'Credential created. Copy the token now.',
    newToken: 'New token',
    credentialMeta: '{agent} · Created {createdAt} · Last used {lastUsedAt}',
    revoke: 'Revoke',
    enable: 'Enable',
    enablingCredentialAndRefreshing: 'Enabling credential and refreshing workspace settings...',
    revokingCredentialAndRefreshing: 'Revoking credential and refreshing workspace settings...',
    credentialUpdateFailed: 'Credential could not be updated.',
    credentialEnabled: 'Credential enabled.',
    credentialRevoked: 'Credential revoked.',
    noCredentialsYet: 'No credentials have been created yet.',
    noEnabledAgentsAvailable: 'Enable an agent before creating credentials.',
    authEvents: 'Auth events',
    recentAccess: 'Recent access',
    noAuthEventsYet: 'No auth events yet.'
  },
  workspaceAssets: {
    workspaceFiles: 'Workspace files',
    sharedDocuments: 'Shared documents',
    unknownAuthor: 'Unknown author',
    hidePreview: 'Hide preview',
    preview: 'Preview',
    downloadOnly: 'Download only',
    download: 'Download',
    previewUnavailable: 'Preview unavailable for this file type.',
    noSharedDocuments: 'No shared documents yet',
    noSharedDocumentsDescription: 'Upload policies, briefs, playbooks, and references so the workspace keeps shared context close at hand.',
    reference: 'Reference',
    policy: 'Policy',
    playbook: 'Playbook',
    brief: 'Brief',
    fileSelected: '{name} selected',
    workspaceScopeHint: 'Uploads are stored at workspace scope and remain available across projects.',
    uploading: 'Uploading...',
    uploadFile: 'Upload file',
    chooseFileBeforeUploading: 'Choose a file before uploading.',
    fileUploadFailed: 'File upload failed.'
  },
  queuePage: {
    eyebrow: 'Operations',
    title: 'Agent Queue',
    description: 'Compact operational view of agent-owned work, attention items, and active flow.',
    attentionNow: 'Attention now',
    attentionNowDetail: 'Review, unblock, or inspect stalled runs',
    running: 'Running',
    runningDetail: 'Active runs with recent signals',
    readyToDispatch: 'Ready to dispatch',
    readyToDispatchDetail: 'Agent-owned tasks not started yet',
    needsAttention: 'Needs attention',
    noAttentionDescription: 'No review, blocked, or stale agent work right now.',
    nothingNeedsAttention: 'Nothing needs attention',
    nothingNeedsAttentionDescription: 'Review, blocked, and stale agent-owned work will collect here in one queue.',
    runningNormally: 'Running normally',
    runningNormallyDescription: 'Active agent runs with recent signals and no immediate intervention needed.',
    readyToDispatchDescription: 'Agent-owned tasks that are ready to start once capacity is available.',
    queueIsClear: 'Queue is clear',
    queueClearWithTodo: 'There is agent-owned work ready to start, but nothing is currently running.',
    queueClearWithoutWork: 'There is no active or pending agent-owned work right now.',
    inReviewCount: '{count} in review',
    blockedCount: '{count} blocked',
    staleCount: '{count} stale',
    runningCount: '{count} running',
    readyToDispatchCount: '{count} ready to dispatch'
  },
  membersPage: {
    eyebrow: 'Workspace',
    title: 'Members',
    description: 'People and agents available in this workspace.',
    manageWorkspace: 'Manage workspace'
  },
  myTasksPage: {
    eyebrow: 'Tasks',
    title: 'My Tasks',
    description: 'Your work queue across personal and agent-owned tasks.',
    visibleWork: 'Visible work',
    groupedByStatus: 'Grouped by status.',
    visibleWorkDescription: 'Review {reviewCount} · Blocked {blockedCount} · Stale agent runs {staleCount}',
    nothingMatches: 'Nothing matches this view',
    adjustFilters: 'Adjust filters or switch to board view.'
  },
  savedTaskViews: {
    promptName: 'Name this saved view',
    views: 'Views',
    save: 'Save',
    remove: 'Remove',
    removeAria: 'Remove {label}',
    title: 'Saved views',
    description: 'Save a reusable combination of layout, filters, and sort once you move away from the default view.',
    saveCurrent: 'Save current view',
    empty: 'No saved views yet. Switch layout or apply filters to create one.'
  },
  boardGridInteractive: {
    moveFailed: 'Task could not be moved.',
    eyebrow: 'Board',
    syncing: 'Syncing...',
    live: 'Board live',
    empty: 'No tasks on this board yet.',
    due: 'Due {value}',
    subtasks: '{count} subtasks',
    subtaskOf: 'Subtask of {title}',
    drag: 'Drag'
  },
  memberDirectory: {
    directory: 'Directory',
    workspaceMembers: 'Workspace members',
    description: 'Compact member directory with {humanCount} humans and {agentCount} agents.',
    noMembersYet: 'No members yet',
    noMembersDescription: 'Add people or sync agents before assigning work. Once members exist, this page becomes the quickest way to scan who is available.',
    manageWorkspace: 'Manage workspace',
    member: 'Member',
    type: 'Type',
    load: 'Load',
    projects: 'Projects',
    state: 'State',
    noProjects: 'No projects',
    enabled: 'Enabled',
    disabled: 'Disabled',
    human: 'Human',
    agent: 'Agent'
  },
  taskWatchers: {
    title: 'Watchers',
    description: 'Followers can track the task without owning it.',
    updateFailed: 'Watchers could not be updated.',
    count: '{count} watchers following this task.',
    saving: 'Saving...',
    save: 'Save watchers'
  },
  projectsPage: {
    description: 'Active workspaces and their current task load.',
    active: 'Active',
    all: 'All',
    newProject: 'New project',
    noProjects: 'No projects',
    noProjectsDescription: 'Create the first project when you are ready to organize work.',
    createFirstProject: 'Create first project'
  },
  newProjectPage: {
    eyebrow: 'New project',
    title: 'Create a project with just enough structure.',
    description: 'Projects are the operational container between workspace context and task execution. Keep the framing simple and clear.'
  },
  taskEditPage: {
    eyebrow: 'Task edit',
    editTaskTitle: '{id} · Edit task',
    description: 'Update the core task metadata without expanding the workflow model beyond what the product needs today.'
  },
  projectForms: {
    createEyebrow: 'Create project',
    createTitle: 'Start a new operational container',
    createDescription: 'Keep it simple: define the project, add a short context summary, and let tasks inherit the rest later.',
    projectName: 'Project name',
    projectNamePlaceholder: 'Mission Control Expansion',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Describe the purpose, expected output, and what this project should optimize for.',
    startDate: 'Start date',
    endDate: 'End date',
    visibility: 'Visibility',
    visibleToWorkspace: 'Visible to workspace',
    visibleToProjectMembersOnly: 'Visible to project members only',
    createHelper: 'New projects start with a lightweight context block so tasks can inherit a stable working frame without adding extra ceremony. Visibility stays simple and can be tightened later from project settings.',
    savedToDefaultWorkspace: 'Saved into the default workspace.',
    creating: 'Creating...',
    createProject: 'Create project',
    projectNameRequired: 'Project name is required.',
    projectCreateFailed: 'Project could not be created.',
    editEyebrow: 'Edit project',
    editDescription: 'Update the project name, description, dates, visibility, and lifecycle state.',
    lifecycle: 'Lifecycle',
    archived: 'Archived',
    changesSavedImmediately: 'Changes are saved immediately.',
    saving: 'Saving...',
    saveChanges: 'Save changes',
    projectUpdateFailed: 'Project could not be updated.',
    dangerZone: 'Danger zone',
    deleteProjectDescription: 'Deleting this project permanently removes all its tasks, comments, attachments, and execution history. Type the project name exactly to confirm.',
    deleteProject: 'Delete project',
    deleting: 'Deleting...',
    projectDeleteFailed: 'Project could not be deleted.',
    projectNameConfirmMismatch: 'Project name does not match. Type it exactly to confirm.',
    governanceEyebrow: 'Project governance',
    governanceTitle: '{name} settings',
    governanceDescription: 'Keep project access rules and lifecycle states explicit without turning governance into an admin maze.',
    visibilityHint: 'Workspace-visible projects appear to the whole workspace. Project-members-only projects are intended for scoped work.',
    lifecycleHint: 'Archived projects stay accessible directly, but they drop out of the default active project list so current work stays focused.',
    governanceHelper: 'Project roles stay lightweight: leads steer the project, members can own work, and observers can follow without owning tasks.',
    governanceIdleHint: 'These controls are intentionally simple and API-first.',
    saveSettings: 'Save settings',
    governanceUpdateFailed: 'Project settings could not be updated.',
    membersEyebrow: 'Project members',
    membersTitle: 'Manage {name}',
    membersDescription: 'Project membership defines task scope. Viewer-role members can follow work, but they should not own tasks.',
    projectMembersUpdateFailed: 'Project members could not be updated.',
    observerHint: 'Observers can review and follow work, but they cannot own tasks.',
    assignmentsHint: 'Task assignments are automatically constrained to this member set.',
    saveMembers: 'Save members',
    lead: 'Lead',
    member: 'Member',
    observer: 'Observer',
    human: 'Human',
    agent: 'Agent',
    projectAccess: 'Project access',
    editProject: 'Edit project',
    addTask: 'Add task',
    projectTasks: 'Project tasks',
    memberScopeTitle: '{name} member scope',
    memberScopeDescription: 'Project membership is the assignment boundary for tasks in this project.',
    editPageTitle: 'Edit {name}',
    editPageDescription: 'Update project details, lifecycle, and visibility. Delete the project from the danger zone below.'
  },
  taskForms: {
    newTaskEyebrow: 'New task',
    newTaskTitle: '{name} · Create task',
    newTaskDescription: 'Tasks should be quick to add, with assignment kept inside the project member boundary.',
    createEyebrow: 'Create task',
    createTitle: 'New task in {name}',
    createDescription: 'Keep the task lightweight. The project and workspace already carry most of the context.',
    title: 'Title',
    titlePlaceholder: 'Improve review queue handoff',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Summarize the work clearly without restating the whole project context.',
    tags: 'Tags',
    tagsPlaceholder: 'UI, Review, Delivery',
    status: 'Status',
    todo: 'Todo',
    inProgress: 'In Progress',
    inReview: 'In Review',
    blocked: 'Blocked',
    done: 'Done',
    priority: 'Priority',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
    assignee: 'Assignee',
    unassigned: 'Unassigned',
    parentTask: 'Parent task',
    noParentTask: 'No parent task',
    startDate: 'Start date',
    dueDate: 'Due date',
    assigneeHint: 'Assignee options are intentionally limited to active non-viewer project members so task ownership stays scoped to people or agents who can act.',
    defaultStatusHint: 'Status defaults to Todo unless you choose otherwise.',
    creating: 'Creating...',
    createTask: 'Create task',
    taskTitleRequired: 'Task title is required.',
    taskCreateFailed: 'Task could not be created.',
    editEyebrow: 'Edit task',
    editTitle: 'Update {id}',
    editDescription: 'Keep {name} moving without overcomplicating the workflow.',
    blockedReason: 'Blocked reason',
    blockedReasonPlaceholder: 'Only needed if the task is blocked.',
    statusHint: 'Status changes are now actor-aware: human and agent workflows follow different allowed transitions.',
    activityHint: 'Task changes are recorded in activity.',
    saving: 'Saving...',
    saveChanges: 'Save changes',
    taskUpdateFailed: 'Task could not be updated.',
    dangerZone: 'Danger zone',
    deleteTaskDescription: 'Permanently delete this task and all its history.',
    deleteTask: 'Delete task',
    deleting: 'Deleting...',
    deleteTaskConfirm: 'Permanently delete task {id}? All comments, attachments, and execution history will be removed. This cannot be undone.',
    taskDeleteFailed: 'Task could not be deleted.'
  },
  seededContext: {
    workspaceTitle: 'Workspace context',
    projectTitle: 'Project context',
    projectSummaryFallback: '{name} is a new project without a detailed context brief yet.',
    projectBulletKeepScope: 'Keep scope explicit and simple.',
    projectBulletInheritContext: 'Let tasks inherit project context instead of rewriting it in every task.'
  },
  signInHighlights: [
    'Workspace-aware task management',
    'Shared human and agent operations',
    'Comments, activity, and execution kept separate'
  ],
  agentDocsApi: {
    summary: 'Mission Control is being shaped so agents can operate against stable task, project, and execution contracts without relying on UI scraping.',
    auth: {
      owner: 'Cookie-backed owner session for product access.',
      agent: 'Bearer token credentials scoped per agent member for API access.',
      notes: [
        'Agent credentials are created from Manage Workspace.',
        'Tokens are shown once at creation time.',
        'Agent scopes gate read and write API access.'
      ]
    },
    resources: {
      workspaceContextPurpose: 'Read workspace context and operational rules.',
      projectContextPurpose: 'Read project scope and inherited workspace context.',
      projectCreatePurpose: 'Create a new project in the default workspace with a simple visibility rule.',
      projectGovernanceReadPurpose: 'Read project governance settings including lifecycle and visibility.',
      projectGovernanceUpdatePurpose: 'Update project lifecycle and visibility without changing routes or task structure.',
      projectMembersReadPurpose: 'Read the current project member scope and available workspace members.',
      projectMembersUpdatePurpose: 'Replace the member scope for a project.',
      memberUpdatePurpose: 'Update workspace role metadata and, for agents, manage enabled state and allowed action permissions.',
      constructorReadPurpose: 'Read the active Constructor workspace integration settings.',
      constructorUpdatePurpose: 'Create or update the active Constructor workspace integration settings.',
      constructorSyncPurpose: 'Discover available agents through Constructor public API and sync them into workspace members for Constructor use.',
      constructorDispatchPurpose: 'Owner-only Constructor dispatch using a server-authored Mission Control prompt. Dispatch is rejected when the task description is too underspecified for safe agent execution.',
      constructorStatusPurpose: 'Poll Constructor execution state for an in-flight dispatched task and sync the local Mission Control task status.',
      constructorCallbackPurpose: 'Receive Constructor completion callbacks and project the final response into Mission Control comments and execution state.',
      agentCredentialsListPurpose: 'Owner-only listing of issued agent credentials and available scopes.',
      agentCredentialsCreatePurpose: 'Create a scoped bearer credential for an enabled agent member.',
      agentCredentialUpdatePurpose: 'Enable or revoke an existing agent credential.',
      searchPurpose: 'Search tasks and projects inside the active workspace.',
      taskCreatePurpose: 'Create a task inside a project with assignee options constrained to project members.',
      taskReadPurpose: 'Read task metadata with resolved workspace and project context.',
      taskUpdatePurpose: 'Update core task metadata from a stable mutation endpoint, including actor-type workflow rules and permission checks.',
      taskWatchersReadPurpose: 'Read follower/watcher membership for a task without mixing it into assignment ownership.',
      taskAttachmentsReadPurpose: 'Read attachment metadata for a task.',
      taskAttachmentsCreatePurpose: 'Upload a file onto a task using the Docker-local storage contract, including agent-attributed output uploads.',
      attachmentDownloadPurpose: 'Download a stored task attachment by id.',
      attachmentPreviewPurpose: 'Preview supported image, document, and text artifact types inline.',
      taskWatchersUpdatePurpose: 'Replace the task watcher list so humans and agents can follow work without owning it.',
      taskContextPurpose: 'Read the deterministic context resolution payload for a task.',
      taskCommentsReadPurpose: 'Read human-facing discussion.',
      taskCommentsCreatePurpose: 'Append a human-facing comment.',
      taskActivityPurpose: 'Read audit-style task history.',
      taskExecutionReadPurpose: 'Read machine-facing execution logs.',
      taskExecutionCreatePurpose: 'Append an execution log entry.',
      docsReadPurpose: 'Read the current human-readable and machine-readable integration summary.',
      docsContractPurpose: 'Export a constrained machine-readable contract bundle for autonomous clients.'
    },
    contract: {
      description: 'Machine-readable contract bundle for autonomous clients. Keep this stable, additive, and easier to consume than UI pages.',
      authentication: {
        owner: 'Authenticated product routes and owner-only APIs use the mission_control_session cookie.',
        agent: 'Scoped API access uses Authorization: Bearer <token>.',
        notes: [
          'Owner-only admin endpoints do not accept agent credentials.',
          'Agent tokens are scope-limited and revocable.',
          'Workspace Constructor linking is owner-only and stores integration tokens server-side.'
        ]
      },
      contextResolution: {
        notes: [
          'Workspace defines broad operational rules.',
          'Project narrows scope and can override workspace fields.',
          'Task adds a focused hint and should not duplicate inherited context.'
        ]
      },
      channels: {
        comments: 'Human-facing communication.',
        activity: 'Audit history of meaningful task events.',
        execution: 'Machine-facing run state and logs.'
      },
      notes: {
        projectGovernanceVisibility: 'visibility is constrained to workspace or project_members.',
        projectGovernanceStatus: 'status is constrained to active or archived.',
        projectMembersRoles: 'Project roles are lead, member, and observer.',
        projectMembersObserver: 'Observer project members can follow work but cannot own tasks.',
        constructorLinkReadReveal: 'Owner-authenticated reads return stored workspace apiToken and callbackToken values so generated tokens can be revealed and copied again from Manage Workspace.',
        constructorLinkKeepApiToken: 'Leave apiToken blank on update to keep the existing saved token.',
        constructorLinkKeepCallbackToken: 'Leave callbackToken blank on update to keep the existing saved token.',
        constructorLinkUnsignedCallbacks: "Constructor's current public API does not sign callbacks, so callbackToken is stored but not enforced on callback delivery.",
        constructorSyncFetchAgents: 'Mission Control calls Constructor GET /api/v1/agents for the active workspace.',
        constructorSyncSourceSystem: 'Synced agents are created or updated as workspace agent members with sourceSystem=constructor.',
        constructorDispatchOwnerOnly: 'Owner-authenticated only.',
        constructorDispatchAgentSelection: 'Dispatch uses the assigned Constructor agent when present, otherwise the synced default Constructor agent.',
        constructorDispatchSourceOfTruth: 'Mission Control authors the final human-facing prompt and keeps task comments and state as the source of truth.',
        constructorStatusTrackedExecution: 'Polls Constructor execution state using the last tracked bridgeExecutionId.',
        constructorStatusDedupedLogs: 'Mission Control appends deduplicated execution log lines as state changes arrive.',
        constructorCallbackTerminal: 'Receives Constructor terminal callbacks for previously dispatched tasks.',
        constructorCallbackDeduped: 'Mission Control deduplicates repeated callbacks and writes the final answer into task comments as the responding agent.',
        memberUpdateRoles: 'Workspace roles can be updated for any member.',
        memberUpdateAgentOnly: 'Only agent members can be enabled, disabled, or permission-scoped through this endpoint.',
        memberUpdatePermissions: 'Supported permissions are comment, change_status, and log_execution.',
        agentCredentialsReturnsTokenOnce: 'Returns a newly created token once.',
        agentCredentialsOwnerOnly: 'Only owner-authenticated clients can create or revoke credentials.',
        searchScope: 'Search is currently scoped to projects and tasks in the active workspace.',
        taskCreateAssignees: 'Assignees must belong to the project.',
        taskCreateViewerObserver: 'Viewer workspace members and observer project members cannot own tasks.',
        taskCreateParentProject: 'Parent tasks must belong to the same project.',
        taskAttachmentCreateActorTypes: 'actorType supports human and agent.',
        taskAttachmentCreateEnabledAgent: 'Agent-attributed uploads require the named actor to resolve to an enabled agent in the task workspace.',
        taskAttachmentCreateOutputs: 'Agent uploads are useful for generated outputs and deliverables.',
        attachmentPreviewSupported: 'Supported preview types currently include images, pdf, text, markdown, json, and xml files.',
        taskUpdateDisabledAgents: 'Disabled agents cannot be assigned.',
        taskUpdateViewerRole: 'Viewer-role members cannot own tasks.',
        taskUpdateObserverRole: 'Observer project members cannot own tasks.',
        taskUpdateTransitionPolicies: 'Human-triggered transitions and agent-triggered transitions are validated against different workflow policies.',
        taskUpdateAgentStatusModel: 'Agent-owned tasks follow a constrained status model: todo -> in_progress -> review/done or blocked.',
        taskUpdateAgentPermission: 'Agent-owned transitions require the change_status permission.',
        taskUpdateDoneSummary: 'When an agent-owned task reaches done and the agent can comment, a human-readable completion summary is posted automatically.',
        taskWatchersUpdateMeaning: 'Watchers follow a task without becoming the assignee.',
        taskAttachmentUploadStorage: 'Files are stored on the Docker-local app filesystem through a simple storage contract.',
        taskAttachmentUploadEnabledAgent: 'Agent-attributed uploads require an enabled agent actor in the same task workspace.',
        taskCommentCreatePermission: 'Agent-authored comments require the comment permission.',
        taskCommentCreateMentions: 'Inline @Name mentions are preserved as part of the comment body for human-facing coordination.',
        taskCommentUpdateHumanOnly: 'This version supports editing human-authored comments while keeping activity history intact.',
        taskExecutionAppendPermission: 'Appending execution logs requires the log_execution permission.'
      }
    }
  },
  agentDocsPage: {
    eyebrow: 'Agent docs',
    title: 'Documentation for future autonomous agent usage.',
    description: 'Tasks inherit workspace and project context, and autonomous clients authenticate through scoped bearer credentials.',
    readJsonSummary: 'Read JSON summary',
    exportContract: 'Export contract',
    workspaceContextTitle: 'Workspace context source of truth',
    apiShapeEyebrow: 'API shape',
    implementedResourcesTitle: 'Implemented resources',
    implementedResourcesDescription: 'These endpoints are live now and reflect the same context model shown in the product UI.',
    examplesEyebrow: 'Examples',
    samplePayloadsTitle: 'Sample payloads',
    samplePayloadsDescription: 'A future agent orchestrator should be able to use these contracts without relying on UI scraping.',
    resolutionModelEyebrow: 'Resolution model',
    howTasksFindContextTitle: 'How tasks find context',
    howTasksFindContextDescription: 'This is the simple model we should preserve as the app grows.',
    exportsEyebrow: 'Exports',
    machineReadableOutputsTitle: 'Machine-readable outputs',
    machineReadableOutputsDescription: 'Autonomous clients should not need to scrape this page. Exportable contract endpoints are part of the product now.',
    implementedResources: [
      { title: 'GET /api/workspaces/default/context', body: 'Returns workspace-level context, policies, members, and top-level operational norms.' },
      { title: 'GET /api/projects/:slug/context', body: 'Returns project-level context, scope, success criteria, and linked workspace inheritance.' },
      { title: 'POST /api/projects', body: 'Creates a new project in the default workspace using a compact mutation payload and a simple visibility rule.' },
      { title: 'PATCH /api/projects/:slug', body: 'Updates project lifecycle and visibility without introducing a heavy admin system.' },
      { title: 'GET /api/projects/:slug/members', body: 'Reads the explicit member scope for a project along with project roles, lifecycle, and visibility settings.' },
      { title: 'PUT /api/projects/:slug/members', body: 'Replaces the project member scope and role map that task assignment depends on.' },
      { title: 'PATCH /api/members/:memberId', body: 'Updates workspace role metadata and, for agents, enabled state plus action permissions.' },
      { title: 'POST /api/workspaces/current/agent-credentials', body: 'Creates a scoped bearer credential for an enabled agent member. Tokens are returned once at creation.' },
      { title: 'PATCH /api/agent-credentials/:credentialId', body: 'Enables or revokes an existing agent credential without changing the underlying member record.' },
      { title: 'GET /api/search?q=:query', body: 'Searches projects and tasks in the active workspace through a stable API surface instead of UI scraping.' },
      { title: 'POST /api/projects/:slug/tasks', body: 'Creates a task inside project context with assignment restricted to project members.' },
      { title: 'GET /api/tasks/:taskId', body: 'Returns task metadata plus resolved context so humans and agents see the same operational frame.' },
      { title: 'PATCH /api/tasks/:taskId', body: "Updates the task's core metadata through a stable mutation endpoint. Human and agent transitions now follow explicit actor-type workflow rules." },
      { title: 'GET /api/tasks/:taskId/watchers', body: 'Reads the follower list for a task so humans and agents can monitor work without becoming the assignee.' },
      { title: 'PUT /api/tasks/:taskId/watchers', body: 'Replaces the watcher list for a task. Watchers are collaboration followers, not task owners.' },
      { title: 'GET /api/tasks/:taskId/attachments', body: 'Reads attachment metadata for a task so clients can discover files without scraping the task page.' },
      { title: 'POST /api/tasks/:taskId/attachments', body: 'Uploads a file onto a task using the local storage contract. Attachments stay separate from comments and execution logs, and can be attributed to an enabled agent.' },
      { title: 'GET /api/attachments/:attachmentId', body: 'Downloads a stored task attachment by id.' },
      { title: 'GET /api/attachments/:attachmentId/preview', body: 'Streams supported files inline so humans can inspect common image, pdf, and text outputs without leaving the product.' },
      { title: 'GET /api/tasks/:taskId/context', body: 'Returns only the deterministic context resolution payload so orchestration can load working context without extra task surface data.' },
      { title: 'POST /api/tasks/:taskId/comments', body: 'Creates a human-facing comment. Separate from machine execution logs and compatible with inline @Name mentions.' },
      { title: 'PATCH /api/tasks/:taskId/comments/:commentId', body: 'Edits an existing human comment while keeping comment history separate from activity and execution channels.' },
      { title: 'GET /api/tasks/:taskId/activity', body: 'Returns audit-style activity entries for the task.' },
      { title: 'GET /api/tasks/:taskId/execution', body: 'Returns machine-facing execution logs for the task.' },
      { title: 'POST /api/tasks/:taskId/execution', body: 'Appends a machine-facing execution log line.' },
      { title: 'GET /api/docs/agents', body: 'Returns the current machine-readable integration contract for this app.' },
      { title: 'GET /api/docs/agents/contract', body: 'Exports a constrained contract bundle for autonomous clients that need explicit resource semantics and response shapes.' }
    ],
    samplePayloads: [
      { title: 'Read task with resolved context', code: 'GET /api/tasks/<taskId>' },
      { title: 'Read task context only', code: 'GET /api/tasks/<taskId>/context' },
      { title: 'Create project', code: 'POST /api/projects\n{\n  "name": "Ops Expansion",\n  "description": "New workstream for ops automation.",\n  "startDate": "2026-03-18",\n  "endDate": "2026-03-28",\n  "visibility": "project_members"\n}' },
      { title: 'Update project governance', code: 'PATCH /api/projects/<projectSlug>\n{\n  "visibility": "project_members",\n  "status": "archived"\n}' },
      { title: 'Set project members', code: 'PUT /api/projects/<projectSlug>/members\n{\n  "membershipIds": ["member_a", "member_b"],\n  "memberRoles": {\n    "member_a": "lead",\n    "member_b": "observer"\n  }\n}' },
      { title: 'Disable an agent', code: 'PATCH /api/members/member_builder\n{\n  "enabled": false\n}' },
      { title: 'Create agent credential', code: 'POST /api/workspaces/current/agent-credentials\n{\n  "membershipId": "member_builder",\n  "name": "Builder runner",\n  "scopes": ["tasks.read", "tasks.write", "comments.write"]\n}' },
      { title: 'Update agent permissions', code: 'PATCH /api/members/member_builder\n{\n  "agentPermissions": ["comment", "change_status"]\n}' },
      { title: 'Update workspace role', code: 'PATCH /api/members/member_nora\n{\n  "workspaceRole": "admin"\n}' },
      { title: 'Create task in project', code: 'POST /api/projects/<projectSlug>/tasks\n{\n  "title": "Prepare review queue handoff",\n  "status": "todo",\n  "priority": "medium",\n  "assigneeId": "member_a",\n  "parentTaskId": "<parentTaskId>",\n  "tags": ["Board", "Review"]\n}' },
      { title: 'Advance agent workflow', code: 'PATCH /api/tasks/<taskId>\n{\n  "status": "review",\n  "actorType": "agent"\n}' },
      { title: 'Advance human workflow', code: 'PATCH /api/tasks/<taskId>\n{\n  "status": "in_progress",\n  "actorType": "human"\n}' },
      { title: 'Restructure a task', code: 'PATCH /api/tasks/<taskId>\n{\n  "parentTaskId": "<parentTaskId>",\n  "tags": ["List View", "UX"]\n}' },
      { title: 'Set task watchers', code: 'PUT /api/tasks/<taskId>/watchers\n{\n  "membershipIds": ["member_builder", "member_owner"]\n}' },
      { title: 'Upload task attachment', code: 'POST /api/tasks/<taskId>/attachments\nmultipart/form-data\n- file: workspace-layout-notes.txt\n- artifactType: reference' },
      { title: 'Upload agent output artifact', code: 'POST /api/tasks/<taskId>/attachments\nmultipart/form-data\n- file: execution-summary.md\n- artifactType: output\n- actorType: agent\n- actorName: <agentName>' },
      { title: 'Preview supported artifact inline', code: 'GET /api/attachments/attachment_123/preview' },
      { title: 'Post human-facing comment', code: 'POST /api/tasks/<taskId>/comments\n{\n  "author": "<actorName>",\n  "role": "<agentRole>",\n  "tone": "agent",\n  "body": "Execution completed. Ready for review."\n}' },
      { title: 'Edit a human comment', code: 'PATCH /api/tasks/<taskId>/comments/<commentId>\n{\n  "body": "Updated copy after reviewing @<ownerName> feedback."\n}' },
      { title: 'Append execution log', code: 'POST /api/tasks/<taskId>/execution\n{\n  "line": "Collected project context and began implementation."\n}' },
      { title: 'Read project context', code: 'GET /api/projects/<projectSlug>/context' },
      { title: 'Search the active workspace', code: 'GET /api/search?q=review' }
    ],
    workspaceContextBlock: {
      title: 'Workspace context',
      summary: 'Define how this workspace operates before projects, tasks, and agents start using it.',
      bullets: [
        'Keep workspace rules short enough to inherit into projects.',
        'Use this area for norms around ownership, review, and documentation.'
      ]
    },
    resolutionSections: [
      {
        title: 'Core resources',
        summary: 'Agents should work against stable resources instead of scraping UI surfaces.',
        bullets: [
          'Workspace: settings, context, members, shared files',
          'Project: governance, membership, status, task collection',
          'Task: metadata, comments, activity, execution, attachments',
          'Execution: status, logs, summary, blocked reason'
        ]
      },
      {
        title: 'Agent workflow',
        summary: 'Keep the autonomous loop simple, scoped, and auditable.',
        bullets: [
          'Read the task with inherited workspace and project context',
          'Start work only when permissions and visibility allow it',
          'Write execution logs without mixing into human comments',
          'Hand back for review, block, or complete with a clear summary'
        ]
      },
      {
        title: 'Documentation expectations',
        summary: 'Contracts should stay additive, explicit, and easy for both humans and agents to inspect.',
        bullets: [
          'Stable endpoint contracts and example payload shapes',
          'Explicit actor rules and allowed transitions',
          'Error semantics that autonomous clients can recover from',
          'Clear separation between comments, activity, and execution logs'
        ]
      }
    ],
    exportItems: [
      { title: '/api/docs/agents', body: 'High-level JSON summary of current resources, principles, and example resolution semantics.' },
      { title: '/api/docs/agents/contract', body: 'Constrained contract bundle with resource semantics, request shapes, and response-shape hints for autonomous usage.' },
      { title: 'Operational rule', body: 'Agent capabilities describe what an agent is good at. Agent permissions define what an agent is allowed to do in the product.' },
      { title: 'Workflow rule', body: 'Task transitions are now actor-aware: human operators and agent actors have different allowed paths through the same status model.' }
    ]
  }
};

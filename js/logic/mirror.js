export function createMirrorState() {
  return {
    active: false,
    sourceIndex: null,
    selectedCardIndex: null,
    parentName: '',
    subName: '',
    subInstruction: '',
    displayText: ''
  };
}

export function resetMirrorState(state) {
  if (!state || typeof state !== 'object') return createMirrorState();
  state.mirror = createMirrorState();
  return state.mirror;
}

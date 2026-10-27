.pragma library
// Timing comes from the animate skill's UI ranges; curves are its strong ease-out/in-out.
function ms(kind) { return {focus:160,press:120,scroll:200,fade:240,settle:120}[kind]; }
function easeOut() { return [0.23,1,0.32,1,1,1]; }
function easeInOut() { return [0.77,0,0.175,1,1,1]; }

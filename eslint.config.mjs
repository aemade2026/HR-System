import globals from "globals";

export default [
  {
    files: ["api.js", "app.js", "sw.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ApiService: "writable",
        AuditMiddleware: "writable",
        LocalDatabase: "writable",
        USE_BACKEND_API: "writable",
        DEFAULT_AVATARS: "writable",
        detectGender: "writable",
        supabaseClient: "writable",
        supabase: "writable",
        INITIAL_DATABASE: "readonly",
        cloneData: "readonly",
        openRequestDetailsModal: "readonly",
        requestDeviceBiometricVerification: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-redeclare": "error",
      "no-dupe-keys": "error"
    }
  }
];

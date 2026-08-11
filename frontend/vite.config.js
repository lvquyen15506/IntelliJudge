// SPDX-License-Identifier: MIT
// Copyright (c) 2026 La Văn Quyền. All rights reserved.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    host: true
  }
})

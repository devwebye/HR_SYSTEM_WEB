import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          employees: path.resolve(__dirname, 'pages/employees.html'),
          shifts: path.resolve(__dirname, 'pages/shifts.html'),
          attendance: path.resolve(__dirname, 'pages/attendance.html'),
          leaves: path.resolve(__dirname, 'pages/leaves.html'),
          payroll: path.resolve(__dirname, 'pages/payroll.html'),
          reports: path.resolve(__dirname, 'pages/reports.html'),
          help: path.resolve(__dirname, 'pages/help.html'),
        },
      },
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});

import type { ServerFunctionClient } from 'payload';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import { importMap } from './admin/importMap.js';

type Args = { children: React.ReactNode };

// Payload admin root layout: RootLayout рендерит собственные <html>/<body> и
// монтирует ConfigProvider и остальные admin-провайдеры. Без этого файла
// /admin наследовал бы (public)-layout без ConfigProvider → useConfig()
// undefined → 500. serverFunction обязателен для admin-действий (создание
// первого пользователя, формы) в Payload 3.
const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

export default function PayloadAdminLayout({ children }: Args) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
}

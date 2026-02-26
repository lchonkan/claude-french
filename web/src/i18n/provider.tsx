import { IntlProvider } from "react-intl";
import { type ReactNode } from "react";
import messages from "./es.json";

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <IntlProvider messages={messages} locale="es" defaultLocale="es">
      {children}
    </IntlProvider>
  );
}

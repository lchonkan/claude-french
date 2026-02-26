import { useIntl } from "react-intl";

export default function Profile() {
  const intl = useIntl();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {intl.formatMessage({ id: "nav.profile" })}
      </h1>
      <p className="mt-4 text-gray-500">
        Gestiona tu perfil y configuracion.
      </p>
    </div>
  );
}

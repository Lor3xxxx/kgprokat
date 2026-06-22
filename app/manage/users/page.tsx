import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import CreateUserForm from "./CreateUserForm";
import { updateUserAction, deleteUserAction, resetDeviceAction } from "./actions";

export const dynamic = "force-dynamic";

const field = "w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-red-500 focus:outline-none";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { username: "asc" }] });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Пользователи</h1>
        <p className="mt-1 text-sm text-gray-500">
          Каждый аккаунт работает только с одного устройства — он привязывается при первом входе. Сменили компьютер — нажмите «Сбросить устройство».
        </p>
      </div>

      {/* Создание аккаунта */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Новый аккаунт</h2>
        <CreateUserForm />
      </section>

      {/* Список аккаунтов */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Аккаунты ({users.length})</h2>
        {users.map((u) => (
          <form
            key={u.id}
            action={updateUserAction}
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <input type="hidden" name="id" value={u.id} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{u.username}</span>
                {u.id === me.userId && <span className="text-xs text-gray-400">(это вы)</span>}
                {!u.active && <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">отключён</span>}
                {u.deviceId ? (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">📱 привязан к устройству</span>
                ) : (
                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">устройство не привязано</span>
                )}
              </div>
              <span className="text-xs text-gray-400">создан {u.createdAt.toLocaleDateString("ru-RU")}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-gray-500">Имя</span>
                <input name="name" defaultValue={u.name} className={field} />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Роль</span>
                <select name="role" defaultValue={u.role} className={field}>
                  <option value="MANAGER">Менеджер</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Новый пароль (пусто = не менять)</span>
                <input name="newPassword" type="text" className={field} placeholder="••••••" />
              </label>
              <label className="flex items-center gap-2 self-end">
                <input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4" />
                <span className="text-sm text-gray-700">Активен</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-600">
                Сохранить
              </button>
              {u.deviceId && (
                <button
                  formAction={resetDeviceAction}
                  className="rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
                >
                  Сбросить устройство
                </button>
              )}
              {u.id !== me.userId && (
                <button
                  formAction={deleteUserAction}
                  className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Удалить
                </button>
              )}
            </div>
          </form>
        ))}
      </section>
    </div>
  );
}

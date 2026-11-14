import { useNavigate } from '@solidjs/router'
import { createSignal, type JSX } from 'solid-js'
import { api } from '../../api/client.ts'
import { ExportDialog, FormDialog } from '../../components/Dialogs.tsx'
import { t } from '../../i18n/index.ts'
import { leaveAccount } from './AccountSection.tsx'
import { Group, Row } from './parts.tsx'

type Dialog = 'delete' | 'export' | null

export function DataSection(): JSX.Element {
  const navigate = useNavigate()
  const [dialog, setDialog] = createSignal<Dialog>(null)
  const [exported, setExported] = createSignal('')
  const close = () => setDialog(null)

  async function showData(): Promise<void> {
    try {
      setExported(JSON.stringify(await api.exportData(), null, 2))
    } catch {
      setExported(t('loadError'))
    }
    setDialog('export')
  }

  return (
    <>
      <div class="flex flex-col gap-4">
        <p class="px-2 text-sm text-on-surface-variant">{t('consentNote')}</p>
        <Group>
          <Row icon="download" label={t('showMyData')} onClick={() => void showData()} />
          <Row icon="delete" label={t('deleteAccount')} danger onClick={() => setDialog('delete')} />
        </Group>
      </div>
      <FormDialog
        open={dialog() === 'delete'}
        title={t('deleteAccountTitle')}
        body={t('deleteAccountBody')}
        fields={[{ key: 'password', label: t('authPassword'), autocomplete: 'current-password' }]}
        submitLabel={t('delete')}
        danger
        onSubmit={async (values) => {
          await api.deleteAccount(values.password ?? '')
          close()
          leaveAccount(navigate)
        }}
        onClose={close}
      />
      <ExportDialog open={dialog() === 'export'} text={exported()} onClose={close} />
    </>
  )
}

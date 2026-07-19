import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from 'reactstrap';

interface Props {
  isOpen: boolean;
  busy?: boolean;
  title?: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  busy,
  title = 'Eliminar venta',
  message = '¿Seguro que querés eliminar esta venta? No se va a tener en cuenta en el listado ni en las estadísticas.',
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} toggle={onCancel} centered>
      <ModalHeader toggle={onCancel}>{title}</ModalHeader>
      <ModalBody>
        <p className="mb-0">{message}</p>
      </ModalBody>
      <ModalFooter>
        <Button className="btn-secondary-fan" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button color="danger" onClick={onConfirm} disabled={busy}>
          {busy ? (
            <>
              <Spinner size="sm" className="me-2" /> Eliminando…
            </>
          ) : (
            'Eliminar'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

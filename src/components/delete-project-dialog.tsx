import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProject } from "@/services/flipping-service";

export const deleteConfirmWord = "HAPUS";

export function DeleteProjectDialog({
  projectId,
  projectName,
  userId,
  onDeleted,
  size = "default",
}: {
  projectId: string;
  projectName: string;
  userId: string;
  onDeleted: () => void;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmed = typed.trim().toUpperCase() === deleteConfirmWord;

  async function remove() {
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      await deleteProject(projectId, userId);
      setOpen(false);
      onDeleted();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Proyek gagal dihapus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) {
          setTyped("");
          setError("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size={size} className="text-destructive">
          <Trash2 aria-hidden="true" /> Hapus proyek
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus proyek “{projectName}”?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Proyek beserta seluruh rinciannya (biaya, RAB, skenario, timeline, risiko, dan
                catatan pemeriksaan) akan <strong>dihapus permanen</strong> dan tidak dapat
                dikembalikan.
              </p>
              <p>
                Ketik <strong>{deleteConfirmWord}</strong> untuk melanjutkan.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void remove();
            }
          }}
          placeholder={deleteConfirmWord}
          aria-label={`Ketik ${deleteConfirmWord} untuk konfirmasi`}
          autoComplete="off"
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!confirmed || busy}
            onClick={() => void remove()}
          >
            {busy ? "Menghapus…" : "Hapus permanen"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

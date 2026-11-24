import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";

const deleteProject = vi.fn();
vi.mock("@/services/flipping-service", () => ({
  deleteProject: (...args: unknown[]) => deleteProject(...args),
}));

function open(onDeleted = vi.fn()) {
  render(
    <DeleteProjectDialog
      projectId="p-1"
      projectName="Rumah Cilodong"
      userId="u-1"
      onDeleted={onDeleted}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /hapus proyek/i }));
  return onDeleted;
}

describe("Hapus proyek", () => {
  beforeEach(() => {
    deleteProject.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("warns that deletion is permanent and requires typing HAPUS", () => {
    open();
    expect(screen.getByText(/dihapus permanen/i)).toBeTruthy();
    const confirm = screen.getByRole("button", { name: /hapus permanen/i });
    expect(confirm).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText(/ketik hapus/i), { target: { value: "hapus" } });
    expect(confirm).toHaveProperty("disabled", false);
  });

  it("deletes only after confirmation and reports success", async () => {
    deleteProject.mockResolvedValue(undefined);
    const onDeleted = open();
    fireEvent.change(screen.getByLabelText(/ketik hapus/i), { target: { value: "HAPUS" } });
    fireEvent.click(screen.getByRole("button", { name: /hapus permanen/i }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(deleteProject).toHaveBeenCalledWith("p-1", "u-1");
  });

  it("keeps the dialog open and shows the error when deletion fails", async () => {
    deleteProject.mockRejectedValue(new Error("Proyek tidak terhapus."));
    const onDeleted = open();
    fireEvent.change(screen.getByLabelText(/ketik hapus/i), { target: { value: "HAPUS" } });
    fireEvent.click(screen.getByRole("button", { name: /hapus permanen/i }));
    await waitFor(() => expect(screen.getByText("Proyek tidak terhapus.")).toBeInTheDocument());
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

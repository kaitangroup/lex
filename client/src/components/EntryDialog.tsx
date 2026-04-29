import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, X } from "lucide-react";
import { Pill } from "./StatusPill";

export type FieldDef =
  | { name: string; label: string; type: "text" | "textarea"; placeholder?: string; required?: boolean; defaultValue?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean; defaultValue?: string }
  | { name: string; label: string; type: "multiselect"; options: { value: string; label: string }[]; defaultValue?: string[] }
  | { name: string; label: string; type: "date"; required?: boolean; defaultValue?: string }
  | { name: string; label: string; type: "number"; placeholder?: string; required?: boolean; defaultValue?: string }
  | { name: string; label: string; type: "file" };

export function EntryDialog({
  trigger,
  title,
  description,
  fields,
  onSubmit,
  submitLabel = "Save",
}: {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  fields: FieldDef[];
  onSubmit: (values: Record<string, any>) => void;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "multiselect") initial[f.name] = (f as any).defaultValue || [];
      else if ("defaultValue" in f && f.defaultValue !== undefined) initial[f.name] = f.defaultValue;
      else initial[f.name] = "";
    });
    return initial;
  });
  const [files, setFiles] = useState<File[]>([]);

  const setVal = (name: string, v: any) => setValues((s) => ({ ...s, [name]: v }));

  const handleSubmit = () => {
    onSubmit({ ...values, _files: files });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" data-testid="button-add-entry">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name} className="text-[12px]">
                {f.label}
                {(f as any).required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {f.type === "text" && (
                <Input
                  id={f.name}
                  value={values[f.name] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setVal(f.name, e.target.value)}
                  data-testid={`input-${f.name}`}
                />
              )}
              {f.type === "number" && (
                <Input
                  id={f.name}
                  type="number"
                  value={values[f.name] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setVal(f.name, e.target.value)}
                  data-testid={`input-${f.name}`}
                />
              )}
              {f.type === "date" && (
                <Input
                  id={f.name}
                  type="date"
                  value={values[f.name] || ""}
                  onChange={(e) => setVal(f.name, e.target.value)}
                  data-testid={`input-${f.name}`}
                />
              )}
              {f.type === "textarea" && (
                <Textarea
                  id={f.name}
                  rows={4}
                  value={values[f.name] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setVal(f.name, e.target.value)}
                  data-testid={`input-${f.name}`}
                />
              )}
              {f.type === "select" && (
                <Select value={values[f.name] || ""} onValueChange={(v) => setVal(f.name, v)}>
                  <SelectTrigger id={f.name} data-testid={`select-${f.name}`}>
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {f.type === "multiselect" && (
                <div className="space-y-1.5">
                  <Select
                    value=""
                    onValueChange={(v) => {
                      const cur = (values[f.name] as string[]) || [];
                      if (!cur.includes(v)) setVal(f.name, [...cur, v]);
                    }}
                  >
                    <SelectTrigger data-testid={`select-${f.name}`}>
                      <SelectValue placeholder="Add…" />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options
                        .filter((o) => !(values[f.name] as string[] | undefined)?.includes(o.value))
                        .map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1.5">
                    {(values[f.name] as string[] | undefined)?.map((v) => {
                      const lbl = f.options.find((o) => o.value === v)?.label || v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVal(f.name, (values[f.name] as string[]).filter((x) => x !== v))}
                          className="inline-flex items-center gap-1"
                        >
                          <Pill tone="blue">
                            {lbl} <X className="w-3 h-3 ml-0.5" />
                          </Pill>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {f.type === "file" && (
                <div>
                  <label
                    htmlFor={f.name}
                    className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-border rounded-lg py-5 px-4 text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-[12.5px]">Drop files here or click to browse</span>
                    <span className="text-[10.5px]">PDF, DOCX, XLSX, images</span>
                  </label>
                  <input
                    id={f.name}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    data-testid={`input-${f.name}`}
                  />
                  {files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {files.map((file, i) => (
                        <div key={i} className="text-[12px] text-muted-foreground flex items-center justify-between bg-muted/40 rounded px-2 py-1">
                          <span className="truncate">{file.name}</span>
                          <button
                            onClick={() => setFiles(files.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive ml-2"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} data-testid="button-submit-entry">{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

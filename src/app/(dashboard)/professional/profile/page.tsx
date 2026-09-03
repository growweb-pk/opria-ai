"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, UserCircle, Save } from "lucide-react";

interface ProfessionalProfileData {
  name: string;
  title: string;
  skills: string[];
  services: string[];
  bio: string;
  certifications: string[];
  hourlyRate: string;
}

const INITIAL_FORM: ProfessionalProfileData = {
  name: "",
  title: "",
  skills: [""],
  services: [""],
  bio: "",
  certifications: [""],
  hourlyRate: "",
};

export default function ProfessionalProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfessionalProfileData>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/professional/profile");
        if (res.status === 404) {
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        const { profile } = await res.json();
        setForm({
          name: profile.name,
          title: profile.title,
          skills: profile.skills.length > 0 ? profile.skills : [""],
          services: profile.services.length > 0 ? profile.services : [""],
          bio: profile.bio ?? "",
          certifications:
            profile.certifications.length > 0 ? profile.certifications : [""],
          hourlyRate: profile.hourlyRate?.toString() ?? "",
        });
        setIsEditing(true);
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load profile. Please refresh.",
        });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [toast]);

  const updateField = useCallback(
    (field: keyof ProfessionalProfileData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const updateArrayItem = useCallback(
    (
      field: "skills" | "services" | "certifications",
      index: number,
      value: string
    ) => {
      setForm((prev) => {
        const arr = [...prev[field]];
        arr[index] = value;
        return { ...prev, [field]: arr };
      });
    },
    []
  );

  const addArrayItem = useCallback(
    (field: "skills" | "services" | "certifications") => {
      setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
    },
    []
  );

  const removeArrayItem = useCallback(
    (
      field: "skills" | "services" | "certifications",
      index: number
    ) => {
      setForm((prev) => {
        const arr = prev[field].filter((_, i) => i !== index);
        if (arr.length === 0) arr.push("");
        return { ...prev, [field]: arr };
      });
    },
    []
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.title.trim()) newErrors.title = "Professional title is required";

    const validSkills = form.skills.filter((s) => s.trim());
    if (validSkills.length === 0)
      newErrors.skills = "At least one skill is required";

    const validServices = form.services.filter((s) => s.trim());
    if (validServices.length === 0)
      newErrors.services = "At least one service is required";

    if (form.hourlyRate.trim()) {
      const rate = parseFloat(form.hourlyRate);
      if (isNaN(rate) || rate <= 0) {
        newErrors.hourlyRate = "Enter a valid hourly rate";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (submitting) return;

    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        title: form.title.trim(),
        skills: form.skills.filter((s) => s.trim()),
        services: form.services.filter((s) => s.trim()),
        bio: form.bio.trim() || undefined,
        certifications: form.certifications.filter((c) => c.trim()),
        hourlyRate: form.hourlyRate.trim()
          ? parseFloat(form.hourlyRate)
          : undefined,
      };

      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/professional/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      toast({
        title: isEditing ? "Profile updated" : "Profile created",
        description: isEditing
          ? "Your professional profile has been updated."
          : "Your professional profile has been created successfully.",
      });

      setIsEditing(true);
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEditing ? "Edit Professional Profile" : "Create Professional Profile"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isEditing
            ? "Update your professional information"
            : "Set up your profile to start receiving opportunities"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Professional Information
            </CardTitle>
            <CardDescription>
              Tell businesses about your expertise and services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name + Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Alex Chen"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Professional Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Web Developer"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-3">
              <Label>Skills</Label>
              <p className="text-sm text-muted-foreground">
                What are your key skills? Add at least one.
              </p>
              {form.skills.map((skill, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Skill ${i + 1}`}
                    value={skill}
                    onChange={(e) => updateArrayItem("skills", i, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem("skills", i)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem("skills")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Skill
              </Button>
              {errors.skills && (
                <p className="text-sm text-destructive">{errors.skills}</p>
              )}
            </div>

            {/* Services */}
            <div className="space-y-3">
              <Label>Services</Label>
              <p className="text-sm text-muted-foreground">
                What services do you offer? Add at least one.
              </p>
              {form.services.map((service, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Service ${i + 1}`}
                    value={service}
                    onChange={(e) =>
                      updateArrayItem("services", i, e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem("services", i)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem("services")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
              {errors.services && (
                <p className="text-sm text-destructive">{errors.services}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell businesses about your experience and approach..."
                value={form.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                rows={3}
              />
            </div>

            {/* Certifications */}
            <div className="space-y-3">
              <Label>Certifications (optional)</Label>
              {form.certifications.map((cert, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Certification ${i + 1}`}
                    value={cert}
                    onChange={(e) =>
                      updateArrayItem("certifications", i, e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem("certifications", i)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem("certifications")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Certification
              </Button>
            </div>

            {/* Hourly Rate */}
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="75"
                  value={form.hourlyRate}
                  onChange={(e) => updateField("hourlyRate", e.target.value)}
                  className="pl-7"
                />
              </div>
              {errors.hourlyRate && (
                <p className="text-sm text-destructive">{errors.hourlyRate}</p>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? "Save Changes" : "Create Profile"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, Building2, Save } from "lucide-react";

interface BusinessProfileData {
  companyName: string;
  industry: string;
  size: string;
  location: string;
  website: string;
  description: string;
  goals: string[];
  challenges: string[];
}

const INITIAL_FORM: BusinessProfileData = {
  companyName: "",
  industry: "",
  size: "",
  location: "",
  website: "",
  description: "",
  goals: [""],
  challenges: [""],
};

export default function BusinessProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<BusinessProfileData>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/business/profile");
        if (res.status === 404) {
          // No profile yet — show empty form
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }
        const { profile } = await res.json();
        setForm({
          companyName: profile.companyName,
          industry: profile.industry,
          size: profile.size,
          location: profile.location,
          website: profile.website ?? "",
          description: profile.description ?? "",
          goals: profile.goals.length > 0 ? profile.goals : [""],
          challenges:
            profile.challenges.length > 0 ? profile.challenges : [""],
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
    (field: keyof BusinessProfileData, value: string) => {
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
    (field: "goals" | "challenges", index: number, value: string) => {
      setForm((prev) => {
        const arr = [...prev[field]];
        arr[index] = value;
        return { ...prev, [field]: arr };
      });
    },
    []
  );

  const addArrayItem = useCallback(
    (field: "goals" | "challenges") => {
      setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
    },
    []
  );

  const removeArrayItem = useCallback(
    (field: "goals" | "challenges", index: number) => {
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

    if (!form.companyName.trim())
      newErrors.companyName = "Company name is required";
    if (!form.industry.trim()) newErrors.industry = "Industry is required";
    if (!form.size) newErrors.size = "Business size is required";
    if (!form.location.trim()) newErrors.location = "Location is required";

    if (form.website.trim()) {
      try {
        new URL(form.website);
      } catch {
        newErrors.website = "Enter a valid URL (e.g. https://example.com)";
      }
    }

    const validGoals = form.goals.filter((g) => g.trim());
    if (validGoals.length === 0)
      newErrors.goals = "At least one goal is required";

    const validChallenges = form.challenges.filter((c) => c.trim());
    if (validChallenges.length === 0)
      newErrors.challenges = "At least one challenge is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (submitting) return;

    setSubmitting(true);

    try {
      // Clean arrays — remove empty entries
      const payload = {
        companyName: form.companyName.trim(),
        industry: form.industry.trim(),
        size: form.size,
        location: form.location.trim(),
        website: form.website.trim() || undefined,
        description: form.description.trim() || undefined,
        goals: form.goals.filter((g) => g.trim()),
        challenges: form.challenges.filter((c) => c.trim()),
      };

      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/business/profile", {
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
          ? "Your business profile has been updated."
          : "Your business profile has been created successfully.",
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
          {isEditing ? "Edit Business Profile" : "Create Business Profile"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isEditing
            ? "Update your business information"
            : "Tell us about your business to get started"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>
              Provide accurate information about your business for better
              AI-powered analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g. Bella's Boutique"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName}</p>
              )}
            </div>

            {/* Industry + Size row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="e.g. Retail / Fashion"
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                />
                {errors.industry && (
                  <p className="text-sm text-destructive">{errors.industry}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Business Size</Label>
                <Select
                  value={form.size}
                  onValueChange={(v) => updateField("size", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLO">Solo (Just me)</SelectItem>
                    <SelectItem value="SMALL">Small (2-10)</SelectItem>
                    <SelectItem value="MEDIUM">Medium (11-50)</SelectItem>
                    <SelectItem value="LARGE">Large (50+)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.size && (
                  <p className="text-sm text-destructive">{errors.size}</p>
                )}
              </div>
            </div>

            {/* Location + Website row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Portland, Oregon"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                />
                {errors.website && (
                  <p className="text-sm text-destructive">{errors.website}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Business Description (optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your business, what you sell, your target customers..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Goals */}
            <div className="space-y-3">
              <Label>Goals</Label>
              <p className="text-sm text-muted-foreground">
                What do you want to achieve? Add at least one goal.
              </p>
              {form.goals.map((goal, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Goal ${i + 1}`}
                    value={goal}
                    onChange={(e) => updateArrayItem("goals", i, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem("goals", i)}
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
                onClick={() => addArrayItem("goals")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </Button>
              {errors.goals && (
                <p className="text-sm text-destructive">{errors.goals}</p>
              )}
            </div>

            {/* Challenges */}
            <div className="space-y-3">
              <Label>Challenges</Label>
              <p className="text-sm text-muted-foreground">
                What obstacles are you facing? Add at least one challenge.
              </p>
              {form.challenges.map((challenge, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Challenge ${i + 1}`}
                    value={challenge}
                    onChange={(e) =>
                      updateArrayItem("challenges", i, e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArrayItem("challenges", i)}
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
                onClick={() => addArrayItem("challenges")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Challenge
              </Button>
              {errors.challenges && (
                <p className="text-sm text-destructive">{errors.challenges}</p>
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

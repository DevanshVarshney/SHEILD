'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { saveHealthcareInfo, loadHealthcareInfo, saveEmergencyContacts, loadEmergencyContacts } from '@/lib/auth';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email(),
});

const pictureSchema = z.object({
  profilePicture: z.instanceof(File).refine(file => file.size > 0, 'A new picture is required.'),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters.'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ['confirmPassword'],
});

const healthcareSchema = z.object({
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  conditions: z.string().optional(),
});

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'A valid phone number is required'),
});

type EmergencyContact = z.infer<typeof contactSchema>;

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [emergencyContactsLoading, setEmergencyContactsLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPictureSaving, setIsPictureSaving] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [isHealthcareSaving, setIsHealthcareSaving] = useState(false);
  const [isContactAdding, setIsContactAdding] = useState(false);
  const [healthcareLoading, setHealthcareLoading] = useState(true);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const pictureForm = useForm<z.infer<typeof pictureSchema>>({
    resolver: zodResolver(pictureSchema),
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const healthcareForm = useForm<z.infer<typeof healthcareSchema>>({
    resolver: zodResolver(healthcareSchema),
    defaultValues: {
      bloodType: '',
      allergies: '',
      medications: '',
      conditions: '',
    },
  });

  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      phone: '',
    }
  });


  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    setIsProfileSaving(true);
    const result = await updateProfile(values);
    if (result.success) {
      toast({ title: 'Profile Updated', description: 'Your personal information has been saved.' });
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
    setIsProfileSaving(false);
  }

  async function onPictureSubmit(values: z.infer<typeof pictureSchema>) {
    setIsPictureSaving(true);
    const result = await updateProfile({ pictureFile: values.profilePicture });
    if (result.success) {
      toast({ title: 'Profile Picture Updated', description: 'Your new picture has been saved.' });
      setPreview(null);
      pictureForm.reset();
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
    setIsPictureSaving(false);
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsPasswordChanging(true);
    const result = await changePassword(values.oldPassword, values.newPassword);
    if (result.success) {
      toast({ title: 'Password Changed', description: 'You have been logged out. Please log in with your new password.' });
      router.push('/login');
    } else {
      toast({ variant: 'destructive', title: 'Change Failed', description: result.error });
    }
    setIsPasswordChanging(false);
  }

  // Load healthcare info and emergency contacts from Firestore
  useEffect(() => {
    if (!user) return;
    setHealthcareLoading(true);
    setEmergencyContactsLoading(true);
    loadHealthcareInfo(user.uid).then(res => {
      if (res.success && res.data) {
        healthcareForm.reset(res.data);
      }
      setHealthcareLoading(false);
    });
    loadEmergencyContacts(user.uid).then(res => {
      if (res.success) {
        setEmergencyContacts(res.contacts);
      }
      setEmergencyContactsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onHealthcareSubmit(values: z.infer<typeof healthcareSchema>) {
    if (!user) return;
    setIsHealthcareSaving(true);
    const result = await saveHealthcareInfo(user.uid, values);
    if (result.success) {
      toast({ title: 'Healthcare Info Updated', description: 'Your healthcare information has been saved.' });
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
    setIsHealthcareSaving(false);
  }

  async function onContactSubmit(values: z.infer<typeof contactSchema>) {
    if (!user) return;
    setIsContactAdding(true);
    const updatedContacts = [...emergencyContacts, values];
    const result = await saveEmergencyContacts(user.uid, updatedContacts);
    if (result.success) {
      setEmergencyContacts(updatedContacts);
      contactForm.reset();
      toast({ title: 'Contact Added', description: `${values.name} has been added to your emergency contacts.` });
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
    setIsContactAdding(false);
  }

  async function removeContact(index: number) {
    if (!user) return;
    const contactToRemove = emergencyContacts[index];
    const updatedContacts = emergencyContacts.filter((_, i) => i !== index);
    const result = await saveEmergencyContacts(user.uid, updatedContacts);
    if (result.success) {
      setEmergencyContacts(updatedContacts);
      toast({ title: 'Contact Removed', description: `${contactToRemove.name} has been removed.` });
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
  }


  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField control={profileForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={profileForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" disabled {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" disabled={isProfileSaving}>{isProfileSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Update your profile picture.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...pictureForm}>
            <form onSubmit={pictureForm.handleSubmit(onPictureSubmit)} className="space-y-4 flex flex-col items-center">
              <FormField
                control={pictureForm.control}
                name="profilePicture"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormLabel>
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center cursor-pointer shadow-inner">
                        {preview ? (
                          <Image src={preview} alt="Profile preview" width={96} height={96} className="rounded-full object-cover w-full h-full" />
                        ) : (
                          user?.profilePictureUrl ? (
                            <Image src={user.profilePictureUrl} alt="{user.name}'Current profile picture" width={96} height={96} className="rounded-full object-cover w-full h-full" />
                          ) : (
                            <span className="text-xs text-muted-foreground text-center">Profile Photo</span>
                          )
                        )}
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            field.onChange(file);
                            setPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPictureSaving || !preview}>{isPictureSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Picture</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password. You will be logged out after a successful change.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField control={passwordForm.control} name="oldPassword" render={({ field }) => (
                <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" variant="destructive" disabled={isPasswordChanging}>{isPasswordChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Change Password</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Healthcare Information</CardTitle>
          <CardDescription>This information may be shared in an emergency.</CardDescription>
        </CardHeader>
        <CardContent>
          {healthcareLoading ? (
            <div className="text-muted-foreground">Loading healthcare info...</div>
          ) : (
            <Form {...healthcareForm}>
              <form onSubmit={healthcareForm.handleSubmit(onHealthcareSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={healthcareForm.control} name="bloodType" render={({ field }) => (
                    <FormItem><FormLabel>Blood Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={healthcareForm.control} name="allergies" render={({ field }) => (
                    <FormItem><FormLabel>Allergies</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={healthcareForm.control} name="medications" render={({ field }) => (
                    <FormItem><FormLabel>Medications</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={healthcareForm.control} name="conditions" render={({ field }) => (
                    <FormItem><FormLabel>Existing Conditions</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={isHealthcareSaving}>{isHealthcareSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Healthcare Info</Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contacts</CardTitle>
          <CardDescription>Manage your list of emergency contacts.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4 mb-6">
            {emergencyContacts.map((contact, index) => (
              <li key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeContact(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="sr-only">Remove contact</span>
                </Button>
              </li>
            ))}
          </ul>
          <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="flex flex-col md:flex-row gap-4 items-start">
              <FormField control={contactForm.control} name="name" render={({ field }) => (
                <FormItem className="flex-1 w-full"><FormLabel>Contact Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={contactForm.control} name="phone" render={({ field }) => (
                <FormItem className="flex-1 w-full"><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="123-456-7890" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="w-full md:w-auto self-end">
                <Button type="submit" className="w-full" disabled={isContactAdding}>{isContactAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Contact</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

    </div>
  );
}

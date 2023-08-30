import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FirestoreService } from '../services/firestore.service';

import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { getStorage, ref, uploadString } from 'firebase/storage';
import { AuthService } from '../services/auth.service';
import { finalize } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  user: any = null;
  loaded: boolean = false;

  constructor(
    private authService: AuthService,
    private angularFirestorage: AngularFireStorage,
    private firestoreService: FirestoreService,
  ) {
    this.authService.user$.subscribe((user: any) => {
      if (user) {
        this.user = user;
      }
    });
  }

  async addNewToGallery(photo: any, type: number) {
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 100,
      webUseInput: true,
    });

    const storage = getStorage();
    const date = new Date().getTime();

    photo.hour = date;

    const name = `${this.user.userEmail} ${date}`;
    const storageRef = ref(storage, name);
    const url = this.angularFirestorage.ref(name);
    
    this.loaded=true;
    uploadString(storageRef as any, capturedPhoto.dataUrl as any, 'data_url').then(() => {
      this.loaded=false;
      url.getDownloadURL().subscribe((url1: any) => {
        photo.pathFoto = url1;
        this.firestoreService.addPhoto(photo, type);
        this.authService.toast('Foto subida con éxito', 'success');
      });
    });
  } // end of addNewToGallery

  async selectImageAndUpload(photo: any, type: number) {
    // Open the gallery and select an image
    const images = await Camera.pickImages({
      quality: 90,
      limit: 10,
    });

    for (let i = 0; i < images.photos.length; i++) {
      const image = images.photos[i];

      if (image.webPath) {
        // Fetch the image data
        const response = await fetch(image.webPath);
        const blob = await response.blob();

        const date = new Date().getTime();
        photo.hour = date;
        const name = `${this.user.userEmail} ${date}`;


        // Upload the image to Firebase
        const ref = this.angularFirestorage.ref(name);
        const task = ref.put(blob);
        this.loaded = true;
        task.snapshotChanges().pipe(
          finalize(() => {
            this.loaded = false;
            ref.getDownloadURL().subscribe((downloadURL: string) => {
              photo.pathFoto = downloadURL;
              this.firestoreService.addPhoto(photo, type);
              this.authService.toast('Foto subida con éxito', 'success');
            });
          })
        ).subscribe();
      } else {
        console.log('No selecciono una imagen');
      }
    }
  }

}
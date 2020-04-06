import { Component, ViewChild, ElementRef } from '@angular/core';

import { Plugins } from '@capacitor/core';
import { Observable } from 'rxjs';
// import { AngularFirestoreCollection, AngularFirestore } from '@angular/fire/firestore/public_api';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestoreCollection, AngularFirestore } from 'angularfire2/firestore';
const { Geolocation } = Plugins;
import { map } from 'rxjs/operators';

declare var google;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  locations: Observable<any>;
  locationsCollection: AngularFirestoreCollection<any>;
  user = null;
  watch = null;
  isTracking = null;

  @ViewChild('map', {static: false}) mapElement: ElementRef;
  map: any;
  markers = [];

  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {
    this.anonLogin();
  }

  ionViewWillEnter() {
    this.loadMap();
  }

  loadMap() {
    const latLng = new google.maps.LatLng(-34.397, 150.644);

    const mapOptions = {
      center: latLng,
      zoom: 5,
      mapTypeId: 'roadmap'
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
  }

  anonLogin() {
    this.afAuth.auth.signInAnonymously().then(res => {
      this.user = res.user;
      console.log(this.user);

      this.locationsCollection = this.afs.collection(
        `locations/${this.user.uid}/track`,
        ref => ref.orderBy('timestamp')
      );

      // load firebase data
      this.locations = this.locationsCollection.snapshotChanges().pipe(
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data();
            const id = a.payload.doc.id;
            return { id, ...data };
          }))
      );

      // update map
      this.locations.subscribe(locations => {
        console.log('new locations: ', locations);
        this.updateMap(locations);
      });
    });
  }

  updateMap(locations) {
    this.markers.map(marker => marker.setMap(null));
    this.markers = [];

    for (const loc of locations) {
      const latLng = new google.maps.LatLng(loc.lat, loc.lng);

      const marker = new google.maps.Marker({
        position: latLng,
        animation: 'drop',
        map: this.map
      });
      this.markers.push(marker);
    }

  }

  startTracking() {
    this.isTracking = true;
    this.watch = Geolocation.watchPosition({}, (position, err) => {
      console.log('new position: ', position);
      if (position) {
        this.addNewLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.timestamp
        );
      }
    });
  }

  stopTracking() {
    Geolocation.clearWatch({ id: this.watch }).then(() => {
      this.isTracking = false;
    });
  }

  addNewLocation(lat, lng, timestamp) {
    this.locationsCollection.add({
      lat,
      lng,
      timestamp
    });

    const position = new google.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.map.setZoom(5);
  }

  deleteLocation(pos) {
    this.locationsCollection.doc(pos.id).delete();
  }



}

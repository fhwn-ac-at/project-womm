import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Model, Mongoose } from 'mongoose';
import { Observable, map } from 'rxjs';

@Injectable()
export class RemoveUnderscoreFieldsInterceptor implements NestInterceptor {
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (typeof data === 'object' && data !== null) {
          return this.stripUnderscoreFields(data);
        }
        return data;
      }),
    );
  }

  private stripUnderscoreFields(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.stripUnderscoreFields(item));
    }

    if (typeof obj === 'object' && obj) {
      if (obj instanceof Model) {
        return this.stripUnderscoreFields(obj._doc);
      }

      return Object.keys(obj).reduce((result, key) => {
        if (!key.startsWith('_') && !key.startsWith('$')) {
          result[key] = this.stripUnderscoreFields(obj[key]);
        }
        return result;
      }, {});
    }

    return obj;
  }
}

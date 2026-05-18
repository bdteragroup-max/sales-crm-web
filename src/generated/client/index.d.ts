
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model MonthlyTarget
 * 
 */
export type MonthlyTarget = $Result.DefaultSelection<Prisma.$MonthlyTargetPayload>
/**
 * Model Schedule
 * 
 */
export type Schedule = $Result.DefaultSelection<Prisma.$SchedulePayload>
/**
 * Model EmployeeSale
 * 
 */
export type EmployeeSale = $Result.DefaultSelection<Prisma.$EmployeeSalePayload>
/**
 * Model Company
 * 
 */
export type Company = $Result.DefaultSelection<Prisma.$CompanyPayload>
/**
 * Model Contact
 * 
 */
export type Contact = $Result.DefaultSelection<Prisma.$ContactPayload>
/**
 * Model Quotation
 * 
 */
export type Quotation = $Result.DefaultSelection<Prisma.$QuotationPayload>
/**
 * Model Telesale
 * 
 */
export type Telesale = $Result.DefaultSelection<Prisma.$TelesalePayload>
/**
 * Model BusinessType
 * 
 */
export type BusinessType = $Result.DefaultSelection<Prisma.$BusinessTypePayload>
/**
 * Model PostalData
 * 
 */
export type PostalData = $Result.DefaultSelection<Prisma.$PostalDataPayload>
/**
 * Model Competitor
 * 
 */
export type Competitor = $Result.DefaultSelection<Prisma.$CompetitorPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient({
   *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
   * })
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.monthlyTarget`: Exposes CRUD operations for the **MonthlyTarget** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MonthlyTargets
    * const monthlyTargets = await prisma.monthlyTarget.findMany()
    * ```
    */
  get monthlyTarget(): Prisma.MonthlyTargetDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.schedule`: Exposes CRUD operations for the **Schedule** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Schedules
    * const schedules = await prisma.schedule.findMany()
    * ```
    */
  get schedule(): Prisma.ScheduleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.employeeSale`: Exposes CRUD operations for the **EmployeeSale** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more EmployeeSales
    * const employeeSales = await prisma.employeeSale.findMany()
    * ```
    */
  get employeeSale(): Prisma.EmployeeSaleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.company`: Exposes CRUD operations for the **Company** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Companies
    * const companies = await prisma.company.findMany()
    * ```
    */
  get company(): Prisma.CompanyDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.contact`: Exposes CRUD operations for the **Contact** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Contacts
    * const contacts = await prisma.contact.findMany()
    * ```
    */
  get contact(): Prisma.ContactDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.quotation`: Exposes CRUD operations for the **Quotation** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Quotations
    * const quotations = await prisma.quotation.findMany()
    * ```
    */
  get quotation(): Prisma.QuotationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.telesale`: Exposes CRUD operations for the **Telesale** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Telesales
    * const telesales = await prisma.telesale.findMany()
    * ```
    */
  get telesale(): Prisma.TelesaleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.businessType`: Exposes CRUD operations for the **BusinessType** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BusinessTypes
    * const businessTypes = await prisma.businessType.findMany()
    * ```
    */
  get businessType(): Prisma.BusinessTypeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.postalData`: Exposes CRUD operations for the **PostalData** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PostalData
    * const postalData = await prisma.postalData.findMany()
    * ```
    */
  get postalData(): Prisma.PostalDataDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.competitor`: Exposes CRUD operations for the **Competitor** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Competitors
    * const competitors = await prisma.competitor.findMany()
    * ```
    */
  get competitor(): Prisma.CompetitorDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.8.0
   * Query Engine version: 3c6e192761c0362d496ed980de936e2f3cebcd3a
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    MonthlyTarget: 'MonthlyTarget',
    Schedule: 'Schedule',
    EmployeeSale: 'EmployeeSale',
    Company: 'Company',
    Contact: 'Contact',
    Quotation: 'Quotation',
    Telesale: 'Telesale',
    BusinessType: 'BusinessType',
    PostalData: 'PostalData',
    Competitor: 'Competitor'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "monthlyTarget" | "schedule" | "employeeSale" | "company" | "contact" | "quotation" | "telesale" | "businessType" | "postalData" | "competitor"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      MonthlyTarget: {
        payload: Prisma.$MonthlyTargetPayload<ExtArgs>
        fields: Prisma.MonthlyTargetFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MonthlyTargetFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MonthlyTargetFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>
          }
          findFirst: {
            args: Prisma.MonthlyTargetFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MonthlyTargetFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>
          }
          findMany: {
            args: Prisma.MonthlyTargetFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>[]
          }
          create: {
            args: Prisma.MonthlyTargetCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>
          }
          createMany: {
            args: Prisma.MonthlyTargetCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MonthlyTargetCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>[]
          }
          delete: {
            args: Prisma.MonthlyTargetDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>
          }
          update: {
            args: Prisma.MonthlyTargetUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>
          }
          deleteMany: {
            args: Prisma.MonthlyTargetDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MonthlyTargetUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.MonthlyTargetUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>[]
          }
          upsert: {
            args: Prisma.MonthlyTargetUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MonthlyTargetPayload>
          }
          aggregate: {
            args: Prisma.MonthlyTargetAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMonthlyTarget>
          }
          groupBy: {
            args: Prisma.MonthlyTargetGroupByArgs<ExtArgs>
            result: $Utils.Optional<MonthlyTargetGroupByOutputType>[]
          }
          count: {
            args: Prisma.MonthlyTargetCountArgs<ExtArgs>
            result: $Utils.Optional<MonthlyTargetCountAggregateOutputType> | number
          }
        }
      }
      Schedule: {
        payload: Prisma.$SchedulePayload<ExtArgs>
        fields: Prisma.ScheduleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ScheduleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ScheduleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>
          }
          findFirst: {
            args: Prisma.ScheduleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ScheduleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>
          }
          findMany: {
            args: Prisma.ScheduleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>[]
          }
          create: {
            args: Prisma.ScheduleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>
          }
          createMany: {
            args: Prisma.ScheduleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ScheduleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>[]
          }
          delete: {
            args: Prisma.ScheduleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>
          }
          update: {
            args: Prisma.ScheduleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>
          }
          deleteMany: {
            args: Prisma.ScheduleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ScheduleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ScheduleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>[]
          }
          upsert: {
            args: Prisma.ScheduleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SchedulePayload>
          }
          aggregate: {
            args: Prisma.ScheduleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSchedule>
          }
          groupBy: {
            args: Prisma.ScheduleGroupByArgs<ExtArgs>
            result: $Utils.Optional<ScheduleGroupByOutputType>[]
          }
          count: {
            args: Prisma.ScheduleCountArgs<ExtArgs>
            result: $Utils.Optional<ScheduleCountAggregateOutputType> | number
          }
        }
      }
      EmployeeSale: {
        payload: Prisma.$EmployeeSalePayload<ExtArgs>
        fields: Prisma.EmployeeSaleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EmployeeSaleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EmployeeSaleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>
          }
          findFirst: {
            args: Prisma.EmployeeSaleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EmployeeSaleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>
          }
          findMany: {
            args: Prisma.EmployeeSaleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>[]
          }
          create: {
            args: Prisma.EmployeeSaleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>
          }
          createMany: {
            args: Prisma.EmployeeSaleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EmployeeSaleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>[]
          }
          delete: {
            args: Prisma.EmployeeSaleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>
          }
          update: {
            args: Prisma.EmployeeSaleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>
          }
          deleteMany: {
            args: Prisma.EmployeeSaleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EmployeeSaleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EmployeeSaleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>[]
          }
          upsert: {
            args: Prisma.EmployeeSaleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmployeeSalePayload>
          }
          aggregate: {
            args: Prisma.EmployeeSaleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEmployeeSale>
          }
          groupBy: {
            args: Prisma.EmployeeSaleGroupByArgs<ExtArgs>
            result: $Utils.Optional<EmployeeSaleGroupByOutputType>[]
          }
          count: {
            args: Prisma.EmployeeSaleCountArgs<ExtArgs>
            result: $Utils.Optional<EmployeeSaleCountAggregateOutputType> | number
          }
        }
      }
      Company: {
        payload: Prisma.$CompanyPayload<ExtArgs>
        fields: Prisma.CompanyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CompanyFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CompanyFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>
          }
          findFirst: {
            args: Prisma.CompanyFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CompanyFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>
          }
          findMany: {
            args: Prisma.CompanyFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>[]
          }
          create: {
            args: Prisma.CompanyCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>
          }
          createMany: {
            args: Prisma.CompanyCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CompanyCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>[]
          }
          delete: {
            args: Prisma.CompanyDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>
          }
          update: {
            args: Prisma.CompanyUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>
          }
          deleteMany: {
            args: Prisma.CompanyDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CompanyUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CompanyUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>[]
          }
          upsert: {
            args: Prisma.CompanyUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompanyPayload>
          }
          aggregate: {
            args: Prisma.CompanyAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCompany>
          }
          groupBy: {
            args: Prisma.CompanyGroupByArgs<ExtArgs>
            result: $Utils.Optional<CompanyGroupByOutputType>[]
          }
          count: {
            args: Prisma.CompanyCountArgs<ExtArgs>
            result: $Utils.Optional<CompanyCountAggregateOutputType> | number
          }
        }
      }
      Contact: {
        payload: Prisma.$ContactPayload<ExtArgs>
        fields: Prisma.ContactFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ContactFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ContactFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>
          }
          findFirst: {
            args: Prisma.ContactFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ContactFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>
          }
          findMany: {
            args: Prisma.ContactFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>[]
          }
          create: {
            args: Prisma.ContactCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>
          }
          createMany: {
            args: Prisma.ContactCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ContactCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>[]
          }
          delete: {
            args: Prisma.ContactDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>
          }
          update: {
            args: Prisma.ContactUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>
          }
          deleteMany: {
            args: Prisma.ContactDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ContactUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ContactUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>[]
          }
          upsert: {
            args: Prisma.ContactUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContactPayload>
          }
          aggregate: {
            args: Prisma.ContactAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateContact>
          }
          groupBy: {
            args: Prisma.ContactGroupByArgs<ExtArgs>
            result: $Utils.Optional<ContactGroupByOutputType>[]
          }
          count: {
            args: Prisma.ContactCountArgs<ExtArgs>
            result: $Utils.Optional<ContactCountAggregateOutputType> | number
          }
        }
      }
      Quotation: {
        payload: Prisma.$QuotationPayload<ExtArgs>
        fields: Prisma.QuotationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.QuotationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.QuotationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>
          }
          findFirst: {
            args: Prisma.QuotationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.QuotationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>
          }
          findMany: {
            args: Prisma.QuotationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>[]
          }
          create: {
            args: Prisma.QuotationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>
          }
          createMany: {
            args: Prisma.QuotationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.QuotationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>[]
          }
          delete: {
            args: Prisma.QuotationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>
          }
          update: {
            args: Prisma.QuotationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>
          }
          deleteMany: {
            args: Prisma.QuotationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.QuotationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.QuotationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>[]
          }
          upsert: {
            args: Prisma.QuotationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuotationPayload>
          }
          aggregate: {
            args: Prisma.QuotationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateQuotation>
          }
          groupBy: {
            args: Prisma.QuotationGroupByArgs<ExtArgs>
            result: $Utils.Optional<QuotationGroupByOutputType>[]
          }
          count: {
            args: Prisma.QuotationCountArgs<ExtArgs>
            result: $Utils.Optional<QuotationCountAggregateOutputType> | number
          }
        }
      }
      Telesale: {
        payload: Prisma.$TelesalePayload<ExtArgs>
        fields: Prisma.TelesaleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TelesaleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TelesaleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>
          }
          findFirst: {
            args: Prisma.TelesaleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TelesaleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>
          }
          findMany: {
            args: Prisma.TelesaleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>[]
          }
          create: {
            args: Prisma.TelesaleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>
          }
          createMany: {
            args: Prisma.TelesaleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TelesaleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>[]
          }
          delete: {
            args: Prisma.TelesaleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>
          }
          update: {
            args: Prisma.TelesaleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>
          }
          deleteMany: {
            args: Prisma.TelesaleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TelesaleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TelesaleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>[]
          }
          upsert: {
            args: Prisma.TelesaleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TelesalePayload>
          }
          aggregate: {
            args: Prisma.TelesaleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTelesale>
          }
          groupBy: {
            args: Prisma.TelesaleGroupByArgs<ExtArgs>
            result: $Utils.Optional<TelesaleGroupByOutputType>[]
          }
          count: {
            args: Prisma.TelesaleCountArgs<ExtArgs>
            result: $Utils.Optional<TelesaleCountAggregateOutputType> | number
          }
        }
      }
      BusinessType: {
        payload: Prisma.$BusinessTypePayload<ExtArgs>
        fields: Prisma.BusinessTypeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BusinessTypeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BusinessTypeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>
          }
          findFirst: {
            args: Prisma.BusinessTypeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BusinessTypeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>
          }
          findMany: {
            args: Prisma.BusinessTypeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>[]
          }
          create: {
            args: Prisma.BusinessTypeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>
          }
          createMany: {
            args: Prisma.BusinessTypeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BusinessTypeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>[]
          }
          delete: {
            args: Prisma.BusinessTypeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>
          }
          update: {
            args: Prisma.BusinessTypeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>
          }
          deleteMany: {
            args: Prisma.BusinessTypeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BusinessTypeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BusinessTypeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>[]
          }
          upsert: {
            args: Prisma.BusinessTypeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BusinessTypePayload>
          }
          aggregate: {
            args: Prisma.BusinessTypeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBusinessType>
          }
          groupBy: {
            args: Prisma.BusinessTypeGroupByArgs<ExtArgs>
            result: $Utils.Optional<BusinessTypeGroupByOutputType>[]
          }
          count: {
            args: Prisma.BusinessTypeCountArgs<ExtArgs>
            result: $Utils.Optional<BusinessTypeCountAggregateOutputType> | number
          }
        }
      }
      PostalData: {
        payload: Prisma.$PostalDataPayload<ExtArgs>
        fields: Prisma.PostalDataFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PostalDataFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PostalDataFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>
          }
          findFirst: {
            args: Prisma.PostalDataFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PostalDataFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>
          }
          findMany: {
            args: Prisma.PostalDataFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>[]
          }
          create: {
            args: Prisma.PostalDataCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>
          }
          createMany: {
            args: Prisma.PostalDataCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PostalDataCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>[]
          }
          delete: {
            args: Prisma.PostalDataDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>
          }
          update: {
            args: Prisma.PostalDataUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>
          }
          deleteMany: {
            args: Prisma.PostalDataDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PostalDataUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PostalDataUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>[]
          }
          upsert: {
            args: Prisma.PostalDataUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostalDataPayload>
          }
          aggregate: {
            args: Prisma.PostalDataAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePostalData>
          }
          groupBy: {
            args: Prisma.PostalDataGroupByArgs<ExtArgs>
            result: $Utils.Optional<PostalDataGroupByOutputType>[]
          }
          count: {
            args: Prisma.PostalDataCountArgs<ExtArgs>
            result: $Utils.Optional<PostalDataCountAggregateOutputType> | number
          }
        }
      }
      Competitor: {
        payload: Prisma.$CompetitorPayload<ExtArgs>
        fields: Prisma.CompetitorFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CompetitorFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CompetitorFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>
          }
          findFirst: {
            args: Prisma.CompetitorFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CompetitorFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>
          }
          findMany: {
            args: Prisma.CompetitorFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>[]
          }
          create: {
            args: Prisma.CompetitorCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>
          }
          createMany: {
            args: Prisma.CompetitorCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CompetitorCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>[]
          }
          delete: {
            args: Prisma.CompetitorDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>
          }
          update: {
            args: Prisma.CompetitorUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>
          }
          deleteMany: {
            args: Prisma.CompetitorDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CompetitorUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CompetitorUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>[]
          }
          upsert: {
            args: Prisma.CompetitorUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CompetitorPayload>
          }
          aggregate: {
            args: Prisma.CompetitorAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCompetitor>
          }
          groupBy: {
            args: Prisma.CompetitorGroupByArgs<ExtArgs>
            result: $Utils.Optional<CompetitorGroupByOutputType>[]
          }
          count: {
            args: Prisma.CompetitorCountArgs<ExtArgs>
            result: $Utils.Optional<CompetitorCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    monthlyTarget?: MonthlyTargetOmit
    schedule?: ScheduleOmit
    employeeSale?: EmployeeSaleOmit
    company?: CompanyOmit
    contact?: ContactOmit
    quotation?: QuotationOmit
    telesale?: TelesaleOmit
    businessType?: BusinessTypeOmit
    postalData?: PostalDataOmit
    competitor?: CompetitorOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    quotations: number
    schedules: number
    telesales: number
    monthlyTargets: number
    assignedCompanies: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    quotations?: boolean | UserCountOutputTypeCountQuotationsArgs
    schedules?: boolean | UserCountOutputTypeCountSchedulesArgs
    telesales?: boolean | UserCountOutputTypeCountTelesalesArgs
    monthlyTargets?: boolean | UserCountOutputTypeCountMonthlyTargetsArgs
    assignedCompanies?: boolean | UserCountOutputTypeCountAssignedCompaniesArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountQuotationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QuotationWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSchedulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScheduleWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTelesalesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TelesaleWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountMonthlyTargetsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MonthlyTargetWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAssignedCompaniesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CompanyWhereInput
  }


  /**
   * Count Type CompanyCountOutputType
   */

  export type CompanyCountOutputType = {
    contacts: number
    quotations: number
    telesales: number
    schedules: number
  }

  export type CompanyCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    contacts?: boolean | CompanyCountOutputTypeCountContactsArgs
    quotations?: boolean | CompanyCountOutputTypeCountQuotationsArgs
    telesales?: boolean | CompanyCountOutputTypeCountTelesalesArgs
    schedules?: boolean | CompanyCountOutputTypeCountSchedulesArgs
  }

  // Custom InputTypes
  /**
   * CompanyCountOutputType without action
   */
  export type CompanyCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CompanyCountOutputType
     */
    select?: CompanyCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CompanyCountOutputType without action
   */
  export type CompanyCountOutputTypeCountContactsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContactWhereInput
  }

  /**
   * CompanyCountOutputType without action
   */
  export type CompanyCountOutputTypeCountQuotationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QuotationWhereInput
  }

  /**
   * CompanyCountOutputType without action
   */
  export type CompanyCountOutputTypeCountTelesalesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TelesaleWhereInput
  }

  /**
   * CompanyCountOutputType without action
   */
  export type CompanyCountOutputTypeCountSchedulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScheduleWhereInput
  }


  /**
   * Count Type ContactCountOutputType
   */

  export type ContactCountOutputType = {
    quotations: number
  }

  export type ContactCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    quotations?: boolean | ContactCountOutputTypeCountQuotationsArgs
  }

  // Custom InputTypes
  /**
   * ContactCountOutputType without action
   */
  export type ContactCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContactCountOutputType
     */
    select?: ContactCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ContactCountOutputType without action
   */
  export type ContactCountOutputTypeCountQuotationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QuotationWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    employeeId: string | null
    email: string | null
    fullName: string | null
    phoneNumber: string | null
    role: string | null
    position: string | null
    password: string | null
    createdAt: Date | null
    updatedAt: Date | null
    otpCode: string | null
    otpExpiresAt: Date | null
    isActive: boolean | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    employeeId: string | null
    email: string | null
    fullName: string | null
    phoneNumber: string | null
    role: string | null
    position: string | null
    password: string | null
    createdAt: Date | null
    updatedAt: Date | null
    otpCode: string | null
    otpExpiresAt: Date | null
    isActive: boolean | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    employeeId: number
    email: number
    fullName: number
    phoneNumber: number
    role: number
    position: number
    password: number
    createdAt: number
    updatedAt: number
    otpCode: number
    otpExpiresAt: number
    isActive: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    employeeId?: true
    email?: true
    fullName?: true
    phoneNumber?: true
    role?: true
    position?: true
    password?: true
    createdAt?: true
    updatedAt?: true
    otpCode?: true
    otpExpiresAt?: true
    isActive?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    employeeId?: true
    email?: true
    fullName?: true
    phoneNumber?: true
    role?: true
    position?: true
    password?: true
    createdAt?: true
    updatedAt?: true
    otpCode?: true
    otpExpiresAt?: true
    isActive?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    employeeId?: true
    email?: true
    fullName?: true
    phoneNumber?: true
    role?: true
    position?: true
    password?: true
    createdAt?: true
    updatedAt?: true
    otpCode?: true
    otpExpiresAt?: true
    isActive?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    employeeId: string
    email: string | null
    fullName: string
    phoneNumber: string | null
    role: string
    position: string | null
    password: string
    createdAt: Date
    updatedAt: Date
    otpCode: string | null
    otpExpiresAt: Date | null
    isActive: boolean
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    email?: boolean
    fullName?: boolean
    phoneNumber?: boolean
    role?: boolean
    position?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    otpCode?: boolean
    otpExpiresAt?: boolean
    isActive?: boolean
    quotations?: boolean | User$quotationsArgs<ExtArgs>
    schedules?: boolean | User$schedulesArgs<ExtArgs>
    telesales?: boolean | User$telesalesArgs<ExtArgs>
    employeeSale?: boolean | User$employeeSaleArgs<ExtArgs>
    monthlyTargets?: boolean | User$monthlyTargetsArgs<ExtArgs>
    assignedCompanies?: boolean | User$assignedCompaniesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    email?: boolean
    fullName?: boolean
    phoneNumber?: boolean
    role?: boolean
    position?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    otpCode?: boolean
    otpExpiresAt?: boolean
    isActive?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    employeeId?: boolean
    email?: boolean
    fullName?: boolean
    phoneNumber?: boolean
    role?: boolean
    position?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    otpCode?: boolean
    otpExpiresAt?: boolean
    isActive?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    employeeId?: boolean
    email?: boolean
    fullName?: boolean
    phoneNumber?: boolean
    role?: boolean
    position?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    otpCode?: boolean
    otpExpiresAt?: boolean
    isActive?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "employeeId" | "email" | "fullName" | "phoneNumber" | "role" | "position" | "password" | "createdAt" | "updatedAt" | "otpCode" | "otpExpiresAt" | "isActive", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    quotations?: boolean | User$quotationsArgs<ExtArgs>
    schedules?: boolean | User$schedulesArgs<ExtArgs>
    telesales?: boolean | User$telesalesArgs<ExtArgs>
    employeeSale?: boolean | User$employeeSaleArgs<ExtArgs>
    monthlyTargets?: boolean | User$monthlyTargetsArgs<ExtArgs>
    assignedCompanies?: boolean | User$assignedCompaniesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      quotations: Prisma.$QuotationPayload<ExtArgs>[]
      schedules: Prisma.$SchedulePayload<ExtArgs>[]
      telesales: Prisma.$TelesalePayload<ExtArgs>[]
      employeeSale: Prisma.$EmployeeSalePayload<ExtArgs> | null
      monthlyTargets: Prisma.$MonthlyTargetPayload<ExtArgs>[]
      assignedCompanies: Prisma.$CompanyPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      employeeId: string
      email: string | null
      fullName: string
      phoneNumber: string | null
      role: string
      position: string | null
      password: string
      createdAt: Date
      updatedAt: Date
      otpCode: string | null
      otpExpiresAt: Date | null
      isActive: boolean
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    quotations<T extends User$quotationsArgs<ExtArgs> = {}>(args?: Subset<T, User$quotationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    schedules<T extends User$schedulesArgs<ExtArgs> = {}>(args?: Subset<T, User$schedulesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    telesales<T extends User$telesalesArgs<ExtArgs> = {}>(args?: Subset<T, User$telesalesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    employeeSale<T extends User$employeeSaleArgs<ExtArgs> = {}>(args?: Subset<T, User$employeeSaleArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    monthlyTargets<T extends User$monthlyTargetsArgs<ExtArgs> = {}>(args?: Subset<T, User$monthlyTargetsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    assignedCompanies<T extends User$assignedCompaniesArgs<ExtArgs> = {}>(args?: Subset<T, User$assignedCompaniesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly employeeId: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly fullName: FieldRef<"User", 'String'>
    readonly phoneNumber: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'String'>
    readonly position: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
    readonly otpCode: FieldRef<"User", 'String'>
    readonly otpExpiresAt: FieldRef<"User", 'DateTime'>
    readonly isActive: FieldRef<"User", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.quotations
   */
  export type User$quotationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    where?: QuotationWhereInput
    orderBy?: QuotationOrderByWithRelationInput | QuotationOrderByWithRelationInput[]
    cursor?: QuotationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: QuotationScalarFieldEnum | QuotationScalarFieldEnum[]
  }

  /**
   * User.schedules
   */
  export type User$schedulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    where?: ScheduleWhereInput
    orderBy?: ScheduleOrderByWithRelationInput | ScheduleOrderByWithRelationInput[]
    cursor?: ScheduleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ScheduleScalarFieldEnum | ScheduleScalarFieldEnum[]
  }

  /**
   * User.telesales
   */
  export type User$telesalesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    where?: TelesaleWhereInput
    orderBy?: TelesaleOrderByWithRelationInput | TelesaleOrderByWithRelationInput[]
    cursor?: TelesaleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TelesaleScalarFieldEnum | TelesaleScalarFieldEnum[]
  }

  /**
   * User.employeeSale
   */
  export type User$employeeSaleArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    where?: EmployeeSaleWhereInput
  }

  /**
   * User.monthlyTargets
   */
  export type User$monthlyTargetsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    where?: MonthlyTargetWhereInput
    orderBy?: MonthlyTargetOrderByWithRelationInput | MonthlyTargetOrderByWithRelationInput[]
    cursor?: MonthlyTargetWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MonthlyTargetScalarFieldEnum | MonthlyTargetScalarFieldEnum[]
  }

  /**
   * User.assignedCompanies
   */
  export type User$assignedCompaniesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    where?: CompanyWhereInput
    orderBy?: CompanyOrderByWithRelationInput | CompanyOrderByWithRelationInput[]
    cursor?: CompanyWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CompanyScalarFieldEnum | CompanyScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model MonthlyTarget
   */

  export type AggregateMonthlyTarget = {
    _count: MonthlyTargetCountAggregateOutputType | null
    _avg: MonthlyTargetAvgAggregateOutputType | null
    _sum: MonthlyTargetSumAggregateOutputType | null
    _min: MonthlyTargetMinAggregateOutputType | null
    _max: MonthlyTargetMaxAggregateOutputType | null
  }

  export type MonthlyTargetAvgAggregateOutputType = {
    month: number | null
    year: number | null
    amount: number | null
  }

  export type MonthlyTargetSumAggregateOutputType = {
    month: number | null
    year: number | null
    amount: number | null
  }

  export type MonthlyTargetMinAggregateOutputType = {
    id: string | null
    userId: string | null
    month: number | null
    year: number | null
    amount: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MonthlyTargetMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    month: number | null
    year: number | null
    amount: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MonthlyTargetCountAggregateOutputType = {
    id: number
    userId: number
    month: number
    year: number
    amount: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MonthlyTargetAvgAggregateInputType = {
    month?: true
    year?: true
    amount?: true
  }

  export type MonthlyTargetSumAggregateInputType = {
    month?: true
    year?: true
    amount?: true
  }

  export type MonthlyTargetMinAggregateInputType = {
    id?: true
    userId?: true
    month?: true
    year?: true
    amount?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MonthlyTargetMaxAggregateInputType = {
    id?: true
    userId?: true
    month?: true
    year?: true
    amount?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MonthlyTargetCountAggregateInputType = {
    id?: true
    userId?: true
    month?: true
    year?: true
    amount?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MonthlyTargetAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MonthlyTarget to aggregate.
     */
    where?: MonthlyTargetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MonthlyTargets to fetch.
     */
    orderBy?: MonthlyTargetOrderByWithRelationInput | MonthlyTargetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MonthlyTargetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MonthlyTargets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MonthlyTargets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MonthlyTargets
    **/
    _count?: true | MonthlyTargetCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MonthlyTargetAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MonthlyTargetSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MonthlyTargetMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MonthlyTargetMaxAggregateInputType
  }

  export type GetMonthlyTargetAggregateType<T extends MonthlyTargetAggregateArgs> = {
        [P in keyof T & keyof AggregateMonthlyTarget]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMonthlyTarget[P]>
      : GetScalarType<T[P], AggregateMonthlyTarget[P]>
  }




  export type MonthlyTargetGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MonthlyTargetWhereInput
    orderBy?: MonthlyTargetOrderByWithAggregationInput | MonthlyTargetOrderByWithAggregationInput[]
    by: MonthlyTargetScalarFieldEnum[] | MonthlyTargetScalarFieldEnum
    having?: MonthlyTargetScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MonthlyTargetCountAggregateInputType | true
    _avg?: MonthlyTargetAvgAggregateInputType
    _sum?: MonthlyTargetSumAggregateInputType
    _min?: MonthlyTargetMinAggregateInputType
    _max?: MonthlyTargetMaxAggregateInputType
  }

  export type MonthlyTargetGroupByOutputType = {
    id: string
    userId: string | null
    month: number
    year: number
    amount: number
    createdAt: Date
    updatedAt: Date
    _count: MonthlyTargetCountAggregateOutputType | null
    _avg: MonthlyTargetAvgAggregateOutputType | null
    _sum: MonthlyTargetSumAggregateOutputType | null
    _min: MonthlyTargetMinAggregateOutputType | null
    _max: MonthlyTargetMaxAggregateOutputType | null
  }

  type GetMonthlyTargetGroupByPayload<T extends MonthlyTargetGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MonthlyTargetGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MonthlyTargetGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MonthlyTargetGroupByOutputType[P]>
            : GetScalarType<T[P], MonthlyTargetGroupByOutputType[P]>
        }
      >
    >


  export type MonthlyTargetSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    month?: boolean
    year?: boolean
    amount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | MonthlyTarget$userArgs<ExtArgs>
  }, ExtArgs["result"]["monthlyTarget"]>

  export type MonthlyTargetSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    month?: boolean
    year?: boolean
    amount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | MonthlyTarget$userArgs<ExtArgs>
  }, ExtArgs["result"]["monthlyTarget"]>

  export type MonthlyTargetSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    month?: boolean
    year?: boolean
    amount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | MonthlyTarget$userArgs<ExtArgs>
  }, ExtArgs["result"]["monthlyTarget"]>

  export type MonthlyTargetSelectScalar = {
    id?: boolean
    userId?: boolean
    month?: boolean
    year?: boolean
    amount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MonthlyTargetOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "month" | "year" | "amount" | "createdAt" | "updatedAt", ExtArgs["result"]["monthlyTarget"]>
  export type MonthlyTargetInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MonthlyTarget$userArgs<ExtArgs>
  }
  export type MonthlyTargetIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MonthlyTarget$userArgs<ExtArgs>
  }
  export type MonthlyTargetIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | MonthlyTarget$userArgs<ExtArgs>
  }

  export type $MonthlyTargetPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MonthlyTarget"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string | null
      month: number
      year: number
      amount: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["monthlyTarget"]>
    composites: {}
  }

  type MonthlyTargetGetPayload<S extends boolean | null | undefined | MonthlyTargetDefaultArgs> = $Result.GetResult<Prisma.$MonthlyTargetPayload, S>

  type MonthlyTargetCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MonthlyTargetFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MonthlyTargetCountAggregateInputType | true
    }

  export interface MonthlyTargetDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MonthlyTarget'], meta: { name: 'MonthlyTarget' } }
    /**
     * Find zero or one MonthlyTarget that matches the filter.
     * @param {MonthlyTargetFindUniqueArgs} args - Arguments to find a MonthlyTarget
     * @example
     * // Get one MonthlyTarget
     * const monthlyTarget = await prisma.monthlyTarget.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MonthlyTargetFindUniqueArgs>(args: SelectSubset<T, MonthlyTargetFindUniqueArgs<ExtArgs>>): Prisma__MonthlyTargetClient<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MonthlyTarget that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MonthlyTargetFindUniqueOrThrowArgs} args - Arguments to find a MonthlyTarget
     * @example
     * // Get one MonthlyTarget
     * const monthlyTarget = await prisma.monthlyTarget.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MonthlyTargetFindUniqueOrThrowArgs>(args: SelectSubset<T, MonthlyTargetFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MonthlyTargetClient<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MonthlyTarget that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MonthlyTargetFindFirstArgs} args - Arguments to find a MonthlyTarget
     * @example
     * // Get one MonthlyTarget
     * const monthlyTarget = await prisma.monthlyTarget.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MonthlyTargetFindFirstArgs>(args?: SelectSubset<T, MonthlyTargetFindFirstArgs<ExtArgs>>): Prisma__MonthlyTargetClient<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MonthlyTarget that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MonthlyTargetFindFirstOrThrowArgs} args - Arguments to find a MonthlyTarget
     * @example
     * // Get one MonthlyTarget
     * const monthlyTarget = await prisma.monthlyTarget.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MonthlyTargetFindFirstOrThrowArgs>(args?: SelectSubset<T, MonthlyTargetFindFirstOrThrowArgs<ExtArgs>>): Prisma__MonthlyTargetClient<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MonthlyTargets that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MonthlyTargetFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MonthlyTargets
     * const monthlyTargets = await prisma.monthlyTarget.findMany()
     * 
     * // Get first 10 MonthlyTargets
     * const monthlyTargets = await prisma.monthlyTarget.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const monthlyTargetWithIdOnly = await prisma.monthlyTarget.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MonthlyTargetFindManyArgs>(args?: SelectSubset<T, MonthlyTargetFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MonthlyTarget.
     * @param {MonthlyTargetCreateArgs} args - Arguments to create a MonthlyTarget.
     * @example
     * // Create one MonthlyTarget
     * const MonthlyTarget = await prisma.monthlyTarget.create({
     *   data: {
     *     // ... data to create a MonthlyTarget
     *   }
     * })
     * 
     */
    create<T extends MonthlyTargetCreateArgs>(args: SelectSubset<T, MonthlyTargetCreateArgs<ExtArgs>>): Prisma__MonthlyTargetClient<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MonthlyTargets.
     * @param {MonthlyTargetCreateManyArgs} args - Arguments to create many MonthlyTargets.
     * @example
     * // Create many MonthlyTargets
     * const monthlyTarget = await prisma.monthlyTarget.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MonthlyTargetCreateManyArgs>(args?: SelectSubset<T, MonthlyTargetCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MonthlyTargets and returns the data saved in the database.
     * @param {MonthlyTargetCreateManyAndReturnArgs} args - Arguments to create many MonthlyTargets.
     * @example
     * // Create many MonthlyTargets
     * const monthlyTarget = await prisma.monthlyTarget.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MonthlyTargets and only return the `id`
     * const monthlyTargetWithIdOnly = await prisma.monthlyTarget.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MonthlyTargetCreateManyAndReturnArgs>(args?: SelectSubset<T, MonthlyTargetCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a MonthlyTarget.
     * @param {MonthlyTargetDeleteArgs} args - Arguments to delete one MonthlyTarget.
     * @example
     * // Delete one MonthlyTarget
     * const MonthlyTarget = await prisma.monthlyTarget.delete({
     *   where: {
     *     // ... filter to delete one MonthlyTarget
     *   }
     * })
     * 
     */
    delete<T extends MonthlyTargetDeleteArgs>(args: SelectSubset<T, MonthlyTargetDeleteArgs<ExtArgs>>): Prisma__MonthlyTargetClient<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MonthlyTarget.
     * @param {MonthlyTargetUpdateArgs} args - Arguments to update one MonthlyTarget.
     * @example
     * // Update one MonthlyTarget
     * const monthlyTarget = await prisma.monthlyTarget.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MonthlyTargetUpdateArgs>(args: SelectSubset<T, MonthlyTargetUpdateArgs<ExtArgs>>): Prisma__MonthlyTargetClient<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MonthlyTargets.
     * @param {MonthlyTargetDeleteManyArgs} args - Arguments to filter MonthlyTargets to delete.
     * @example
     * // Delete a few MonthlyTargets
     * const { count } = await prisma.monthlyTarget.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MonthlyTargetDeleteManyArgs>(args?: SelectSubset<T, MonthlyTargetDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MonthlyTargets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MonthlyTargetUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MonthlyTargets
     * const monthlyTarget = await prisma.monthlyTarget.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MonthlyTargetUpdateManyArgs>(args: SelectSubset<T, MonthlyTargetUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MonthlyTargets and returns the data updated in the database.
     * @param {MonthlyTargetUpdateManyAndReturnArgs} args - Arguments to update many MonthlyTargets.
     * @example
     * // Update many MonthlyTargets
     * const monthlyTarget = await prisma.monthlyTarget.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more MonthlyTargets and only return the `id`
     * const monthlyTargetWithIdOnly = await prisma.monthlyTarget.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends MonthlyTargetUpdateManyAndReturnArgs>(args: SelectSubset<T, MonthlyTargetUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one MonthlyTarget.
     * @param {MonthlyTargetUpsertArgs} args - Arguments to update or create a MonthlyTarget.
     * @example
     * // Update or create a MonthlyTarget
     * const monthlyTarget = await prisma.monthlyTarget.upsert({
     *   create: {
     *     // ... data to create a MonthlyTarget
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MonthlyTarget we want to update
     *   }
     * })
     */
    upsert<T extends MonthlyTargetUpsertArgs>(args: SelectSubset<T, MonthlyTargetUpsertArgs<ExtArgs>>): Prisma__MonthlyTargetClient<$Result.GetResult<Prisma.$MonthlyTargetPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MonthlyTargets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MonthlyTargetCountArgs} args - Arguments to filter MonthlyTargets to count.
     * @example
     * // Count the number of MonthlyTargets
     * const count = await prisma.monthlyTarget.count({
     *   where: {
     *     // ... the filter for the MonthlyTargets we want to count
     *   }
     * })
    **/
    count<T extends MonthlyTargetCountArgs>(
      args?: Subset<T, MonthlyTargetCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MonthlyTargetCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MonthlyTarget.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MonthlyTargetAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MonthlyTargetAggregateArgs>(args: Subset<T, MonthlyTargetAggregateArgs>): Prisma.PrismaPromise<GetMonthlyTargetAggregateType<T>>

    /**
     * Group by MonthlyTarget.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MonthlyTargetGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MonthlyTargetGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MonthlyTargetGroupByArgs['orderBy'] }
        : { orderBy?: MonthlyTargetGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MonthlyTargetGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMonthlyTargetGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MonthlyTarget model
   */
  readonly fields: MonthlyTargetFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MonthlyTarget.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MonthlyTargetClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends MonthlyTarget$userArgs<ExtArgs> = {}>(args?: Subset<T, MonthlyTarget$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MonthlyTarget model
   */
  interface MonthlyTargetFieldRefs {
    readonly id: FieldRef<"MonthlyTarget", 'String'>
    readonly userId: FieldRef<"MonthlyTarget", 'String'>
    readonly month: FieldRef<"MonthlyTarget", 'Int'>
    readonly year: FieldRef<"MonthlyTarget", 'Int'>
    readonly amount: FieldRef<"MonthlyTarget", 'Float'>
    readonly createdAt: FieldRef<"MonthlyTarget", 'DateTime'>
    readonly updatedAt: FieldRef<"MonthlyTarget", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MonthlyTarget findUnique
   */
  export type MonthlyTargetFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * Filter, which MonthlyTarget to fetch.
     */
    where: MonthlyTargetWhereUniqueInput
  }

  /**
   * MonthlyTarget findUniqueOrThrow
   */
  export type MonthlyTargetFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * Filter, which MonthlyTarget to fetch.
     */
    where: MonthlyTargetWhereUniqueInput
  }

  /**
   * MonthlyTarget findFirst
   */
  export type MonthlyTargetFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * Filter, which MonthlyTarget to fetch.
     */
    where?: MonthlyTargetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MonthlyTargets to fetch.
     */
    orderBy?: MonthlyTargetOrderByWithRelationInput | MonthlyTargetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MonthlyTargets.
     */
    cursor?: MonthlyTargetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MonthlyTargets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MonthlyTargets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MonthlyTargets.
     */
    distinct?: MonthlyTargetScalarFieldEnum | MonthlyTargetScalarFieldEnum[]
  }

  /**
   * MonthlyTarget findFirstOrThrow
   */
  export type MonthlyTargetFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * Filter, which MonthlyTarget to fetch.
     */
    where?: MonthlyTargetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MonthlyTargets to fetch.
     */
    orderBy?: MonthlyTargetOrderByWithRelationInput | MonthlyTargetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MonthlyTargets.
     */
    cursor?: MonthlyTargetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MonthlyTargets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MonthlyTargets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MonthlyTargets.
     */
    distinct?: MonthlyTargetScalarFieldEnum | MonthlyTargetScalarFieldEnum[]
  }

  /**
   * MonthlyTarget findMany
   */
  export type MonthlyTargetFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * Filter, which MonthlyTargets to fetch.
     */
    where?: MonthlyTargetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MonthlyTargets to fetch.
     */
    orderBy?: MonthlyTargetOrderByWithRelationInput | MonthlyTargetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MonthlyTargets.
     */
    cursor?: MonthlyTargetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MonthlyTargets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MonthlyTargets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MonthlyTargets.
     */
    distinct?: MonthlyTargetScalarFieldEnum | MonthlyTargetScalarFieldEnum[]
  }

  /**
   * MonthlyTarget create
   */
  export type MonthlyTargetCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * The data needed to create a MonthlyTarget.
     */
    data: XOR<MonthlyTargetCreateInput, MonthlyTargetUncheckedCreateInput>
  }

  /**
   * MonthlyTarget createMany
   */
  export type MonthlyTargetCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MonthlyTargets.
     */
    data: MonthlyTargetCreateManyInput | MonthlyTargetCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MonthlyTarget createManyAndReturn
   */
  export type MonthlyTargetCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * The data used to create many MonthlyTargets.
     */
    data: MonthlyTargetCreateManyInput | MonthlyTargetCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * MonthlyTarget update
   */
  export type MonthlyTargetUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * The data needed to update a MonthlyTarget.
     */
    data: XOR<MonthlyTargetUpdateInput, MonthlyTargetUncheckedUpdateInput>
    /**
     * Choose, which MonthlyTarget to update.
     */
    where: MonthlyTargetWhereUniqueInput
  }

  /**
   * MonthlyTarget updateMany
   */
  export type MonthlyTargetUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MonthlyTargets.
     */
    data: XOR<MonthlyTargetUpdateManyMutationInput, MonthlyTargetUncheckedUpdateManyInput>
    /**
     * Filter which MonthlyTargets to update
     */
    where?: MonthlyTargetWhereInput
    /**
     * Limit how many MonthlyTargets to update.
     */
    limit?: number
  }

  /**
   * MonthlyTarget updateManyAndReturn
   */
  export type MonthlyTargetUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * The data used to update MonthlyTargets.
     */
    data: XOR<MonthlyTargetUpdateManyMutationInput, MonthlyTargetUncheckedUpdateManyInput>
    /**
     * Filter which MonthlyTargets to update
     */
    where?: MonthlyTargetWhereInput
    /**
     * Limit how many MonthlyTargets to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * MonthlyTarget upsert
   */
  export type MonthlyTargetUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * The filter to search for the MonthlyTarget to update in case it exists.
     */
    where: MonthlyTargetWhereUniqueInput
    /**
     * In case the MonthlyTarget found by the `where` argument doesn't exist, create a new MonthlyTarget with this data.
     */
    create: XOR<MonthlyTargetCreateInput, MonthlyTargetUncheckedCreateInput>
    /**
     * In case the MonthlyTarget was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MonthlyTargetUpdateInput, MonthlyTargetUncheckedUpdateInput>
  }

  /**
   * MonthlyTarget delete
   */
  export type MonthlyTargetDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
    /**
     * Filter which MonthlyTarget to delete.
     */
    where: MonthlyTargetWhereUniqueInput
  }

  /**
   * MonthlyTarget deleteMany
   */
  export type MonthlyTargetDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MonthlyTargets to delete
     */
    where?: MonthlyTargetWhereInput
    /**
     * Limit how many MonthlyTargets to delete.
     */
    limit?: number
  }

  /**
   * MonthlyTarget.user
   */
  export type MonthlyTarget$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * MonthlyTarget without action
   */
  export type MonthlyTargetDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MonthlyTarget
     */
    select?: MonthlyTargetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MonthlyTarget
     */
    omit?: MonthlyTargetOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MonthlyTargetInclude<ExtArgs> | null
  }


  /**
   * Model Schedule
   */

  export type AggregateSchedule = {
    _count: ScheduleCountAggregateOutputType | null
    _min: ScheduleMinAggregateOutputType | null
    _max: ScheduleMaxAggregateOutputType | null
  }

  export type ScheduleMinAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    description: string | null
    date: Date | null
    status: string | null
    presentationStatus: string | null
    quotationNumber: string | null
    poNumber: string | null
    invoiceNumber: string | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
    companyId: string | null
  }

  export type ScheduleMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    description: string | null
    date: Date | null
    status: string | null
    presentationStatus: string | null
    quotationNumber: string | null
    poNumber: string | null
    invoiceNumber: string | null
    notes: string | null
    createdAt: Date | null
    updatedAt: Date | null
    companyId: string | null
  }

  export type ScheduleCountAggregateOutputType = {
    id: number
    userId: number
    title: number
    description: number
    date: number
    status: number
    presentationStatus: number
    quotationNumber: number
    poNumber: number
    invoiceNumber: number
    notes: number
    createdAt: number
    updatedAt: number
    companyId: number
    _all: number
  }


  export type ScheduleMinAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    description?: true
    date?: true
    status?: true
    presentationStatus?: true
    quotationNumber?: true
    poNumber?: true
    invoiceNumber?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
    companyId?: true
  }

  export type ScheduleMaxAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    description?: true
    date?: true
    status?: true
    presentationStatus?: true
    quotationNumber?: true
    poNumber?: true
    invoiceNumber?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
    companyId?: true
  }

  export type ScheduleCountAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    description?: true
    date?: true
    status?: true
    presentationStatus?: true
    quotationNumber?: true
    poNumber?: true
    invoiceNumber?: true
    notes?: true
    createdAt?: true
    updatedAt?: true
    companyId?: true
    _all?: true
  }

  export type ScheduleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Schedule to aggregate.
     */
    where?: ScheduleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Schedules to fetch.
     */
    orderBy?: ScheduleOrderByWithRelationInput | ScheduleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ScheduleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Schedules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Schedules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Schedules
    **/
    _count?: true | ScheduleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ScheduleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ScheduleMaxAggregateInputType
  }

  export type GetScheduleAggregateType<T extends ScheduleAggregateArgs> = {
        [P in keyof T & keyof AggregateSchedule]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSchedule[P]>
      : GetScalarType<T[P], AggregateSchedule[P]>
  }




  export type ScheduleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ScheduleWhereInput
    orderBy?: ScheduleOrderByWithAggregationInput | ScheduleOrderByWithAggregationInput[]
    by: ScheduleScalarFieldEnum[] | ScheduleScalarFieldEnum
    having?: ScheduleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ScheduleCountAggregateInputType | true
    _min?: ScheduleMinAggregateInputType
    _max?: ScheduleMaxAggregateInputType
  }

  export type ScheduleGroupByOutputType = {
    id: string
    userId: string
    title: string
    description: string | null
    date: Date
    status: string
    presentationStatus: string | null
    quotationNumber: string | null
    poNumber: string | null
    invoiceNumber: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
    companyId: string | null
    _count: ScheduleCountAggregateOutputType | null
    _min: ScheduleMinAggregateOutputType | null
    _max: ScheduleMaxAggregateOutputType | null
  }

  type GetScheduleGroupByPayload<T extends ScheduleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ScheduleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ScheduleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ScheduleGroupByOutputType[P]>
            : GetScalarType<T[P], ScheduleGroupByOutputType[P]>
        }
      >
    >


  export type ScheduleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    description?: boolean
    date?: boolean
    status?: boolean
    presentationStatus?: boolean
    quotationNumber?: boolean
    poNumber?: boolean
    invoiceNumber?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    companyId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    company?: boolean | Schedule$companyArgs<ExtArgs>
  }, ExtArgs["result"]["schedule"]>

  export type ScheduleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    description?: boolean
    date?: boolean
    status?: boolean
    presentationStatus?: boolean
    quotationNumber?: boolean
    poNumber?: boolean
    invoiceNumber?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    companyId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    company?: boolean | Schedule$companyArgs<ExtArgs>
  }, ExtArgs["result"]["schedule"]>

  export type ScheduleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    description?: boolean
    date?: boolean
    status?: boolean
    presentationStatus?: boolean
    quotationNumber?: boolean
    poNumber?: boolean
    invoiceNumber?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    companyId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    company?: boolean | Schedule$companyArgs<ExtArgs>
  }, ExtArgs["result"]["schedule"]>

  export type ScheduleSelectScalar = {
    id?: boolean
    userId?: boolean
    title?: boolean
    description?: boolean
    date?: boolean
    status?: boolean
    presentationStatus?: boolean
    quotationNumber?: boolean
    poNumber?: boolean
    invoiceNumber?: boolean
    notes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    companyId?: boolean
  }

  export type ScheduleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "title" | "description" | "date" | "status" | "presentationStatus" | "quotationNumber" | "poNumber" | "invoiceNumber" | "notes" | "createdAt" | "updatedAt" | "companyId", ExtArgs["result"]["schedule"]>
  export type ScheduleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    company?: boolean | Schedule$companyArgs<ExtArgs>
  }
  export type ScheduleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    company?: boolean | Schedule$companyArgs<ExtArgs>
  }
  export type ScheduleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    company?: boolean | Schedule$companyArgs<ExtArgs>
  }

  export type $SchedulePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Schedule"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      company: Prisma.$CompanyPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      title: string
      description: string | null
      date: Date
      status: string
      presentationStatus: string | null
      quotationNumber: string | null
      poNumber: string | null
      invoiceNumber: string | null
      notes: string | null
      createdAt: Date
      updatedAt: Date
      companyId: string | null
    }, ExtArgs["result"]["schedule"]>
    composites: {}
  }

  type ScheduleGetPayload<S extends boolean | null | undefined | ScheduleDefaultArgs> = $Result.GetResult<Prisma.$SchedulePayload, S>

  type ScheduleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ScheduleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ScheduleCountAggregateInputType | true
    }

  export interface ScheduleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Schedule'], meta: { name: 'Schedule' } }
    /**
     * Find zero or one Schedule that matches the filter.
     * @param {ScheduleFindUniqueArgs} args - Arguments to find a Schedule
     * @example
     * // Get one Schedule
     * const schedule = await prisma.schedule.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ScheduleFindUniqueArgs>(args: SelectSubset<T, ScheduleFindUniqueArgs<ExtArgs>>): Prisma__ScheduleClient<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Schedule that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ScheduleFindUniqueOrThrowArgs} args - Arguments to find a Schedule
     * @example
     * // Get one Schedule
     * const schedule = await prisma.schedule.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ScheduleFindUniqueOrThrowArgs>(args: SelectSubset<T, ScheduleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ScheduleClient<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Schedule that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduleFindFirstArgs} args - Arguments to find a Schedule
     * @example
     * // Get one Schedule
     * const schedule = await prisma.schedule.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ScheduleFindFirstArgs>(args?: SelectSubset<T, ScheduleFindFirstArgs<ExtArgs>>): Prisma__ScheduleClient<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Schedule that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduleFindFirstOrThrowArgs} args - Arguments to find a Schedule
     * @example
     * // Get one Schedule
     * const schedule = await prisma.schedule.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ScheduleFindFirstOrThrowArgs>(args?: SelectSubset<T, ScheduleFindFirstOrThrowArgs<ExtArgs>>): Prisma__ScheduleClient<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Schedules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Schedules
     * const schedules = await prisma.schedule.findMany()
     * 
     * // Get first 10 Schedules
     * const schedules = await prisma.schedule.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scheduleWithIdOnly = await prisma.schedule.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ScheduleFindManyArgs>(args?: SelectSubset<T, ScheduleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Schedule.
     * @param {ScheduleCreateArgs} args - Arguments to create a Schedule.
     * @example
     * // Create one Schedule
     * const Schedule = await prisma.schedule.create({
     *   data: {
     *     // ... data to create a Schedule
     *   }
     * })
     * 
     */
    create<T extends ScheduleCreateArgs>(args: SelectSubset<T, ScheduleCreateArgs<ExtArgs>>): Prisma__ScheduleClient<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Schedules.
     * @param {ScheduleCreateManyArgs} args - Arguments to create many Schedules.
     * @example
     * // Create many Schedules
     * const schedule = await prisma.schedule.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ScheduleCreateManyArgs>(args?: SelectSubset<T, ScheduleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Schedules and returns the data saved in the database.
     * @param {ScheduleCreateManyAndReturnArgs} args - Arguments to create many Schedules.
     * @example
     * // Create many Schedules
     * const schedule = await prisma.schedule.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Schedules and only return the `id`
     * const scheduleWithIdOnly = await prisma.schedule.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ScheduleCreateManyAndReturnArgs>(args?: SelectSubset<T, ScheduleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Schedule.
     * @param {ScheduleDeleteArgs} args - Arguments to delete one Schedule.
     * @example
     * // Delete one Schedule
     * const Schedule = await prisma.schedule.delete({
     *   where: {
     *     // ... filter to delete one Schedule
     *   }
     * })
     * 
     */
    delete<T extends ScheduleDeleteArgs>(args: SelectSubset<T, ScheduleDeleteArgs<ExtArgs>>): Prisma__ScheduleClient<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Schedule.
     * @param {ScheduleUpdateArgs} args - Arguments to update one Schedule.
     * @example
     * // Update one Schedule
     * const schedule = await prisma.schedule.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ScheduleUpdateArgs>(args: SelectSubset<T, ScheduleUpdateArgs<ExtArgs>>): Prisma__ScheduleClient<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Schedules.
     * @param {ScheduleDeleteManyArgs} args - Arguments to filter Schedules to delete.
     * @example
     * // Delete a few Schedules
     * const { count } = await prisma.schedule.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ScheduleDeleteManyArgs>(args?: SelectSubset<T, ScheduleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Schedules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Schedules
     * const schedule = await prisma.schedule.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ScheduleUpdateManyArgs>(args: SelectSubset<T, ScheduleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Schedules and returns the data updated in the database.
     * @param {ScheduleUpdateManyAndReturnArgs} args - Arguments to update many Schedules.
     * @example
     * // Update many Schedules
     * const schedule = await prisma.schedule.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Schedules and only return the `id`
     * const scheduleWithIdOnly = await prisma.schedule.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ScheduleUpdateManyAndReturnArgs>(args: SelectSubset<T, ScheduleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Schedule.
     * @param {ScheduleUpsertArgs} args - Arguments to update or create a Schedule.
     * @example
     * // Update or create a Schedule
     * const schedule = await prisma.schedule.upsert({
     *   create: {
     *     // ... data to create a Schedule
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Schedule we want to update
     *   }
     * })
     */
    upsert<T extends ScheduleUpsertArgs>(args: SelectSubset<T, ScheduleUpsertArgs<ExtArgs>>): Prisma__ScheduleClient<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Schedules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduleCountArgs} args - Arguments to filter Schedules to count.
     * @example
     * // Count the number of Schedules
     * const count = await prisma.schedule.count({
     *   where: {
     *     // ... the filter for the Schedules we want to count
     *   }
     * })
    **/
    count<T extends ScheduleCountArgs>(
      args?: Subset<T, ScheduleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ScheduleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Schedule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ScheduleAggregateArgs>(args: Subset<T, ScheduleAggregateArgs>): Prisma.PrismaPromise<GetScheduleAggregateType<T>>

    /**
     * Group by Schedule.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ScheduleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ScheduleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ScheduleGroupByArgs['orderBy'] }
        : { orderBy?: ScheduleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ScheduleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScheduleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Schedule model
   */
  readonly fields: ScheduleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Schedule.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ScheduleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    company<T extends Schedule$companyArgs<ExtArgs> = {}>(args?: Subset<T, Schedule$companyArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Schedule model
   */
  interface ScheduleFieldRefs {
    readonly id: FieldRef<"Schedule", 'String'>
    readonly userId: FieldRef<"Schedule", 'String'>
    readonly title: FieldRef<"Schedule", 'String'>
    readonly description: FieldRef<"Schedule", 'String'>
    readonly date: FieldRef<"Schedule", 'DateTime'>
    readonly status: FieldRef<"Schedule", 'String'>
    readonly presentationStatus: FieldRef<"Schedule", 'String'>
    readonly quotationNumber: FieldRef<"Schedule", 'String'>
    readonly poNumber: FieldRef<"Schedule", 'String'>
    readonly invoiceNumber: FieldRef<"Schedule", 'String'>
    readonly notes: FieldRef<"Schedule", 'String'>
    readonly createdAt: FieldRef<"Schedule", 'DateTime'>
    readonly updatedAt: FieldRef<"Schedule", 'DateTime'>
    readonly companyId: FieldRef<"Schedule", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Schedule findUnique
   */
  export type ScheduleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * Filter, which Schedule to fetch.
     */
    where: ScheduleWhereUniqueInput
  }

  /**
   * Schedule findUniqueOrThrow
   */
  export type ScheduleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * Filter, which Schedule to fetch.
     */
    where: ScheduleWhereUniqueInput
  }

  /**
   * Schedule findFirst
   */
  export type ScheduleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * Filter, which Schedule to fetch.
     */
    where?: ScheduleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Schedules to fetch.
     */
    orderBy?: ScheduleOrderByWithRelationInput | ScheduleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Schedules.
     */
    cursor?: ScheduleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Schedules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Schedules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Schedules.
     */
    distinct?: ScheduleScalarFieldEnum | ScheduleScalarFieldEnum[]
  }

  /**
   * Schedule findFirstOrThrow
   */
  export type ScheduleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * Filter, which Schedule to fetch.
     */
    where?: ScheduleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Schedules to fetch.
     */
    orderBy?: ScheduleOrderByWithRelationInput | ScheduleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Schedules.
     */
    cursor?: ScheduleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Schedules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Schedules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Schedules.
     */
    distinct?: ScheduleScalarFieldEnum | ScheduleScalarFieldEnum[]
  }

  /**
   * Schedule findMany
   */
  export type ScheduleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * Filter, which Schedules to fetch.
     */
    where?: ScheduleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Schedules to fetch.
     */
    orderBy?: ScheduleOrderByWithRelationInput | ScheduleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Schedules.
     */
    cursor?: ScheduleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Schedules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Schedules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Schedules.
     */
    distinct?: ScheduleScalarFieldEnum | ScheduleScalarFieldEnum[]
  }

  /**
   * Schedule create
   */
  export type ScheduleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * The data needed to create a Schedule.
     */
    data: XOR<ScheduleCreateInput, ScheduleUncheckedCreateInput>
  }

  /**
   * Schedule createMany
   */
  export type ScheduleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Schedules.
     */
    data: ScheduleCreateManyInput | ScheduleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Schedule createManyAndReturn
   */
  export type ScheduleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * The data used to create many Schedules.
     */
    data: ScheduleCreateManyInput | ScheduleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Schedule update
   */
  export type ScheduleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * The data needed to update a Schedule.
     */
    data: XOR<ScheduleUpdateInput, ScheduleUncheckedUpdateInput>
    /**
     * Choose, which Schedule to update.
     */
    where: ScheduleWhereUniqueInput
  }

  /**
   * Schedule updateMany
   */
  export type ScheduleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Schedules.
     */
    data: XOR<ScheduleUpdateManyMutationInput, ScheduleUncheckedUpdateManyInput>
    /**
     * Filter which Schedules to update
     */
    where?: ScheduleWhereInput
    /**
     * Limit how many Schedules to update.
     */
    limit?: number
  }

  /**
   * Schedule updateManyAndReturn
   */
  export type ScheduleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * The data used to update Schedules.
     */
    data: XOR<ScheduleUpdateManyMutationInput, ScheduleUncheckedUpdateManyInput>
    /**
     * Filter which Schedules to update
     */
    where?: ScheduleWhereInput
    /**
     * Limit how many Schedules to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Schedule upsert
   */
  export type ScheduleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * The filter to search for the Schedule to update in case it exists.
     */
    where: ScheduleWhereUniqueInput
    /**
     * In case the Schedule found by the `where` argument doesn't exist, create a new Schedule with this data.
     */
    create: XOR<ScheduleCreateInput, ScheduleUncheckedCreateInput>
    /**
     * In case the Schedule was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ScheduleUpdateInput, ScheduleUncheckedUpdateInput>
  }

  /**
   * Schedule delete
   */
  export type ScheduleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    /**
     * Filter which Schedule to delete.
     */
    where: ScheduleWhereUniqueInput
  }

  /**
   * Schedule deleteMany
   */
  export type ScheduleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Schedules to delete
     */
    where?: ScheduleWhereInput
    /**
     * Limit how many Schedules to delete.
     */
    limit?: number
  }

  /**
   * Schedule.company
   */
  export type Schedule$companyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    where?: CompanyWhereInput
  }

  /**
   * Schedule without action
   */
  export type ScheduleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
  }


  /**
   * Model EmployeeSale
   */

  export type AggregateEmployeeSale = {
    _count: EmployeeSaleCountAggregateOutputType | null
    _min: EmployeeSaleMinAggregateOutputType | null
    _max: EmployeeSaleMaxAggregateOutputType | null
  }

  export type EmployeeSaleMinAggregateOutputType = {
    id: string | null
    userId: string | null
    employeeId: string | null
    fullName: string | null
    createdAt: Date | null
    updatedAt: Date | null
    nickname: string | null
    branch: string | null
    teamLeader: string | null
    position: string | null
    department: string | null
    startDate: Date | null
  }

  export type EmployeeSaleMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    employeeId: string | null
    fullName: string | null
    createdAt: Date | null
    updatedAt: Date | null
    nickname: string | null
    branch: string | null
    teamLeader: string | null
    position: string | null
    department: string | null
    startDate: Date | null
  }

  export type EmployeeSaleCountAggregateOutputType = {
    id: number
    userId: number
    employeeId: number
    fullName: number
    createdAt: number
    updatedAt: number
    nickname: number
    branch: number
    teamLeader: number
    position: number
    department: number
    startDate: number
    _all: number
  }


  export type EmployeeSaleMinAggregateInputType = {
    id?: true
    userId?: true
    employeeId?: true
    fullName?: true
    createdAt?: true
    updatedAt?: true
    nickname?: true
    branch?: true
    teamLeader?: true
    position?: true
    department?: true
    startDate?: true
  }

  export type EmployeeSaleMaxAggregateInputType = {
    id?: true
    userId?: true
    employeeId?: true
    fullName?: true
    createdAt?: true
    updatedAt?: true
    nickname?: true
    branch?: true
    teamLeader?: true
    position?: true
    department?: true
    startDate?: true
  }

  export type EmployeeSaleCountAggregateInputType = {
    id?: true
    userId?: true
    employeeId?: true
    fullName?: true
    createdAt?: true
    updatedAt?: true
    nickname?: true
    branch?: true
    teamLeader?: true
    position?: true
    department?: true
    startDate?: true
    _all?: true
  }

  export type EmployeeSaleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EmployeeSale to aggregate.
     */
    where?: EmployeeSaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EmployeeSales to fetch.
     */
    orderBy?: EmployeeSaleOrderByWithRelationInput | EmployeeSaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EmployeeSaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EmployeeSales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EmployeeSales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned EmployeeSales
    **/
    _count?: true | EmployeeSaleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EmployeeSaleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EmployeeSaleMaxAggregateInputType
  }

  export type GetEmployeeSaleAggregateType<T extends EmployeeSaleAggregateArgs> = {
        [P in keyof T & keyof AggregateEmployeeSale]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEmployeeSale[P]>
      : GetScalarType<T[P], AggregateEmployeeSale[P]>
  }




  export type EmployeeSaleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EmployeeSaleWhereInput
    orderBy?: EmployeeSaleOrderByWithAggregationInput | EmployeeSaleOrderByWithAggregationInput[]
    by: EmployeeSaleScalarFieldEnum[] | EmployeeSaleScalarFieldEnum
    having?: EmployeeSaleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EmployeeSaleCountAggregateInputType | true
    _min?: EmployeeSaleMinAggregateInputType
    _max?: EmployeeSaleMaxAggregateInputType
  }

  export type EmployeeSaleGroupByOutputType = {
    id: string
    userId: string | null
    employeeId: string | null
    fullName: string
    createdAt: Date
    updatedAt: Date
    nickname: string | null
    branch: string | null
    teamLeader: string | null
    position: string | null
    department: string | null
    startDate: Date | null
    _count: EmployeeSaleCountAggregateOutputType | null
    _min: EmployeeSaleMinAggregateOutputType | null
    _max: EmployeeSaleMaxAggregateOutputType | null
  }

  type GetEmployeeSaleGroupByPayload<T extends EmployeeSaleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EmployeeSaleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EmployeeSaleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EmployeeSaleGroupByOutputType[P]>
            : GetScalarType<T[P], EmployeeSaleGroupByOutputType[P]>
        }
      >
    >


  export type EmployeeSaleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    employeeId?: boolean
    fullName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    nickname?: boolean
    branch?: boolean
    teamLeader?: boolean
    position?: boolean
    department?: boolean
    startDate?: boolean
    user?: boolean | EmployeeSale$userArgs<ExtArgs>
  }, ExtArgs["result"]["employeeSale"]>

  export type EmployeeSaleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    employeeId?: boolean
    fullName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    nickname?: boolean
    branch?: boolean
    teamLeader?: boolean
    position?: boolean
    department?: boolean
    startDate?: boolean
    user?: boolean | EmployeeSale$userArgs<ExtArgs>
  }, ExtArgs["result"]["employeeSale"]>

  export type EmployeeSaleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    employeeId?: boolean
    fullName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    nickname?: boolean
    branch?: boolean
    teamLeader?: boolean
    position?: boolean
    department?: boolean
    startDate?: boolean
    user?: boolean | EmployeeSale$userArgs<ExtArgs>
  }, ExtArgs["result"]["employeeSale"]>

  export type EmployeeSaleSelectScalar = {
    id?: boolean
    userId?: boolean
    employeeId?: boolean
    fullName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    nickname?: boolean
    branch?: boolean
    teamLeader?: boolean
    position?: boolean
    department?: boolean
    startDate?: boolean
  }

  export type EmployeeSaleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "employeeId" | "fullName" | "createdAt" | "updatedAt" | "nickname" | "branch" | "teamLeader" | "position" | "department" | "startDate", ExtArgs["result"]["employeeSale"]>
  export type EmployeeSaleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | EmployeeSale$userArgs<ExtArgs>
  }
  export type EmployeeSaleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | EmployeeSale$userArgs<ExtArgs>
  }
  export type EmployeeSaleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | EmployeeSale$userArgs<ExtArgs>
  }

  export type $EmployeeSalePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "EmployeeSale"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string | null
      employeeId: string | null
      fullName: string
      createdAt: Date
      updatedAt: Date
      nickname: string | null
      branch: string | null
      teamLeader: string | null
      position: string | null
      department: string | null
      startDate: Date | null
    }, ExtArgs["result"]["employeeSale"]>
    composites: {}
  }

  type EmployeeSaleGetPayload<S extends boolean | null | undefined | EmployeeSaleDefaultArgs> = $Result.GetResult<Prisma.$EmployeeSalePayload, S>

  type EmployeeSaleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EmployeeSaleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EmployeeSaleCountAggregateInputType | true
    }

  export interface EmployeeSaleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['EmployeeSale'], meta: { name: 'EmployeeSale' } }
    /**
     * Find zero or one EmployeeSale that matches the filter.
     * @param {EmployeeSaleFindUniqueArgs} args - Arguments to find a EmployeeSale
     * @example
     * // Get one EmployeeSale
     * const employeeSale = await prisma.employeeSale.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EmployeeSaleFindUniqueArgs>(args: SelectSubset<T, EmployeeSaleFindUniqueArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one EmployeeSale that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EmployeeSaleFindUniqueOrThrowArgs} args - Arguments to find a EmployeeSale
     * @example
     * // Get one EmployeeSale
     * const employeeSale = await prisma.employeeSale.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EmployeeSaleFindUniqueOrThrowArgs>(args: SelectSubset<T, EmployeeSaleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first EmployeeSale that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeSaleFindFirstArgs} args - Arguments to find a EmployeeSale
     * @example
     * // Get one EmployeeSale
     * const employeeSale = await prisma.employeeSale.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EmployeeSaleFindFirstArgs>(args?: SelectSubset<T, EmployeeSaleFindFirstArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first EmployeeSale that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeSaleFindFirstOrThrowArgs} args - Arguments to find a EmployeeSale
     * @example
     * // Get one EmployeeSale
     * const employeeSale = await prisma.employeeSale.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EmployeeSaleFindFirstOrThrowArgs>(args?: SelectSubset<T, EmployeeSaleFindFirstOrThrowArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more EmployeeSales that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeSaleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all EmployeeSales
     * const employeeSales = await prisma.employeeSale.findMany()
     * 
     * // Get first 10 EmployeeSales
     * const employeeSales = await prisma.employeeSale.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const employeeSaleWithIdOnly = await prisma.employeeSale.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EmployeeSaleFindManyArgs>(args?: SelectSubset<T, EmployeeSaleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a EmployeeSale.
     * @param {EmployeeSaleCreateArgs} args - Arguments to create a EmployeeSale.
     * @example
     * // Create one EmployeeSale
     * const EmployeeSale = await prisma.employeeSale.create({
     *   data: {
     *     // ... data to create a EmployeeSale
     *   }
     * })
     * 
     */
    create<T extends EmployeeSaleCreateArgs>(args: SelectSubset<T, EmployeeSaleCreateArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many EmployeeSales.
     * @param {EmployeeSaleCreateManyArgs} args - Arguments to create many EmployeeSales.
     * @example
     * // Create many EmployeeSales
     * const employeeSale = await prisma.employeeSale.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EmployeeSaleCreateManyArgs>(args?: SelectSubset<T, EmployeeSaleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many EmployeeSales and returns the data saved in the database.
     * @param {EmployeeSaleCreateManyAndReturnArgs} args - Arguments to create many EmployeeSales.
     * @example
     * // Create many EmployeeSales
     * const employeeSale = await prisma.employeeSale.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many EmployeeSales and only return the `id`
     * const employeeSaleWithIdOnly = await prisma.employeeSale.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EmployeeSaleCreateManyAndReturnArgs>(args?: SelectSubset<T, EmployeeSaleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a EmployeeSale.
     * @param {EmployeeSaleDeleteArgs} args - Arguments to delete one EmployeeSale.
     * @example
     * // Delete one EmployeeSale
     * const EmployeeSale = await prisma.employeeSale.delete({
     *   where: {
     *     // ... filter to delete one EmployeeSale
     *   }
     * })
     * 
     */
    delete<T extends EmployeeSaleDeleteArgs>(args: SelectSubset<T, EmployeeSaleDeleteArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one EmployeeSale.
     * @param {EmployeeSaleUpdateArgs} args - Arguments to update one EmployeeSale.
     * @example
     * // Update one EmployeeSale
     * const employeeSale = await prisma.employeeSale.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EmployeeSaleUpdateArgs>(args: SelectSubset<T, EmployeeSaleUpdateArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more EmployeeSales.
     * @param {EmployeeSaleDeleteManyArgs} args - Arguments to filter EmployeeSales to delete.
     * @example
     * // Delete a few EmployeeSales
     * const { count } = await prisma.employeeSale.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EmployeeSaleDeleteManyArgs>(args?: SelectSubset<T, EmployeeSaleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EmployeeSales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeSaleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many EmployeeSales
     * const employeeSale = await prisma.employeeSale.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EmployeeSaleUpdateManyArgs>(args: SelectSubset<T, EmployeeSaleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EmployeeSales and returns the data updated in the database.
     * @param {EmployeeSaleUpdateManyAndReturnArgs} args - Arguments to update many EmployeeSales.
     * @example
     * // Update many EmployeeSales
     * const employeeSale = await prisma.employeeSale.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more EmployeeSales and only return the `id`
     * const employeeSaleWithIdOnly = await prisma.employeeSale.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EmployeeSaleUpdateManyAndReturnArgs>(args: SelectSubset<T, EmployeeSaleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one EmployeeSale.
     * @param {EmployeeSaleUpsertArgs} args - Arguments to update or create a EmployeeSale.
     * @example
     * // Update or create a EmployeeSale
     * const employeeSale = await prisma.employeeSale.upsert({
     *   create: {
     *     // ... data to create a EmployeeSale
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the EmployeeSale we want to update
     *   }
     * })
     */
    upsert<T extends EmployeeSaleUpsertArgs>(args: SelectSubset<T, EmployeeSaleUpsertArgs<ExtArgs>>): Prisma__EmployeeSaleClient<$Result.GetResult<Prisma.$EmployeeSalePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of EmployeeSales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeSaleCountArgs} args - Arguments to filter EmployeeSales to count.
     * @example
     * // Count the number of EmployeeSales
     * const count = await prisma.employeeSale.count({
     *   where: {
     *     // ... the filter for the EmployeeSales we want to count
     *   }
     * })
    **/
    count<T extends EmployeeSaleCountArgs>(
      args?: Subset<T, EmployeeSaleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EmployeeSaleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a EmployeeSale.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeSaleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EmployeeSaleAggregateArgs>(args: Subset<T, EmployeeSaleAggregateArgs>): Prisma.PrismaPromise<GetEmployeeSaleAggregateType<T>>

    /**
     * Group by EmployeeSale.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmployeeSaleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EmployeeSaleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EmployeeSaleGroupByArgs['orderBy'] }
        : { orderBy?: EmployeeSaleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EmployeeSaleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEmployeeSaleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the EmployeeSale model
   */
  readonly fields: EmployeeSaleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for EmployeeSale.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EmployeeSaleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends EmployeeSale$userArgs<ExtArgs> = {}>(args?: Subset<T, EmployeeSale$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the EmployeeSale model
   */
  interface EmployeeSaleFieldRefs {
    readonly id: FieldRef<"EmployeeSale", 'String'>
    readonly userId: FieldRef<"EmployeeSale", 'String'>
    readonly employeeId: FieldRef<"EmployeeSale", 'String'>
    readonly fullName: FieldRef<"EmployeeSale", 'String'>
    readonly createdAt: FieldRef<"EmployeeSale", 'DateTime'>
    readonly updatedAt: FieldRef<"EmployeeSale", 'DateTime'>
    readonly nickname: FieldRef<"EmployeeSale", 'String'>
    readonly branch: FieldRef<"EmployeeSale", 'String'>
    readonly teamLeader: FieldRef<"EmployeeSale", 'String'>
    readonly position: FieldRef<"EmployeeSale", 'String'>
    readonly department: FieldRef<"EmployeeSale", 'String'>
    readonly startDate: FieldRef<"EmployeeSale", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * EmployeeSale findUnique
   */
  export type EmployeeSaleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * Filter, which EmployeeSale to fetch.
     */
    where: EmployeeSaleWhereUniqueInput
  }

  /**
   * EmployeeSale findUniqueOrThrow
   */
  export type EmployeeSaleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * Filter, which EmployeeSale to fetch.
     */
    where: EmployeeSaleWhereUniqueInput
  }

  /**
   * EmployeeSale findFirst
   */
  export type EmployeeSaleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * Filter, which EmployeeSale to fetch.
     */
    where?: EmployeeSaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EmployeeSales to fetch.
     */
    orderBy?: EmployeeSaleOrderByWithRelationInput | EmployeeSaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EmployeeSales.
     */
    cursor?: EmployeeSaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EmployeeSales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EmployeeSales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EmployeeSales.
     */
    distinct?: EmployeeSaleScalarFieldEnum | EmployeeSaleScalarFieldEnum[]
  }

  /**
   * EmployeeSale findFirstOrThrow
   */
  export type EmployeeSaleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * Filter, which EmployeeSale to fetch.
     */
    where?: EmployeeSaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EmployeeSales to fetch.
     */
    orderBy?: EmployeeSaleOrderByWithRelationInput | EmployeeSaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EmployeeSales.
     */
    cursor?: EmployeeSaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EmployeeSales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EmployeeSales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EmployeeSales.
     */
    distinct?: EmployeeSaleScalarFieldEnum | EmployeeSaleScalarFieldEnum[]
  }

  /**
   * EmployeeSale findMany
   */
  export type EmployeeSaleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * Filter, which EmployeeSales to fetch.
     */
    where?: EmployeeSaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EmployeeSales to fetch.
     */
    orderBy?: EmployeeSaleOrderByWithRelationInput | EmployeeSaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing EmployeeSales.
     */
    cursor?: EmployeeSaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EmployeeSales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EmployeeSales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EmployeeSales.
     */
    distinct?: EmployeeSaleScalarFieldEnum | EmployeeSaleScalarFieldEnum[]
  }

  /**
   * EmployeeSale create
   */
  export type EmployeeSaleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * The data needed to create a EmployeeSale.
     */
    data: XOR<EmployeeSaleCreateInput, EmployeeSaleUncheckedCreateInput>
  }

  /**
   * EmployeeSale createMany
   */
  export type EmployeeSaleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many EmployeeSales.
     */
    data: EmployeeSaleCreateManyInput | EmployeeSaleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * EmployeeSale createManyAndReturn
   */
  export type EmployeeSaleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * The data used to create many EmployeeSales.
     */
    data: EmployeeSaleCreateManyInput | EmployeeSaleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * EmployeeSale update
   */
  export type EmployeeSaleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * The data needed to update a EmployeeSale.
     */
    data: XOR<EmployeeSaleUpdateInput, EmployeeSaleUncheckedUpdateInput>
    /**
     * Choose, which EmployeeSale to update.
     */
    where: EmployeeSaleWhereUniqueInput
  }

  /**
   * EmployeeSale updateMany
   */
  export type EmployeeSaleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update EmployeeSales.
     */
    data: XOR<EmployeeSaleUpdateManyMutationInput, EmployeeSaleUncheckedUpdateManyInput>
    /**
     * Filter which EmployeeSales to update
     */
    where?: EmployeeSaleWhereInput
    /**
     * Limit how many EmployeeSales to update.
     */
    limit?: number
  }

  /**
   * EmployeeSale updateManyAndReturn
   */
  export type EmployeeSaleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * The data used to update EmployeeSales.
     */
    data: XOR<EmployeeSaleUpdateManyMutationInput, EmployeeSaleUncheckedUpdateManyInput>
    /**
     * Filter which EmployeeSales to update
     */
    where?: EmployeeSaleWhereInput
    /**
     * Limit how many EmployeeSales to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * EmployeeSale upsert
   */
  export type EmployeeSaleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * The filter to search for the EmployeeSale to update in case it exists.
     */
    where: EmployeeSaleWhereUniqueInput
    /**
     * In case the EmployeeSale found by the `where` argument doesn't exist, create a new EmployeeSale with this data.
     */
    create: XOR<EmployeeSaleCreateInput, EmployeeSaleUncheckedCreateInput>
    /**
     * In case the EmployeeSale was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EmployeeSaleUpdateInput, EmployeeSaleUncheckedUpdateInput>
  }

  /**
   * EmployeeSale delete
   */
  export type EmployeeSaleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
    /**
     * Filter which EmployeeSale to delete.
     */
    where: EmployeeSaleWhereUniqueInput
  }

  /**
   * EmployeeSale deleteMany
   */
  export type EmployeeSaleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EmployeeSales to delete
     */
    where?: EmployeeSaleWhereInput
    /**
     * Limit how many EmployeeSales to delete.
     */
    limit?: number
  }

  /**
   * EmployeeSale.user
   */
  export type EmployeeSale$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * EmployeeSale without action
   */
  export type EmployeeSaleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmployeeSale
     */
    select?: EmployeeSaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmployeeSale
     */
    omit?: EmployeeSaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EmployeeSaleInclude<ExtArgs> | null
  }


  /**
   * Model Company
   */

  export type AggregateCompany = {
    _count: CompanyCountAggregateOutputType | null
    _min: CompanyMinAggregateOutputType | null
    _max: CompanyMaxAggregateOutputType | null
  }

  export type CompanyMinAggregateOutputType = {
    id: string | null
    companyName: string | null
    taxId: string | null
    address: string | null
    createdAt: Date | null
    updatedAt: Date | null
    area: string | null
    branchOrHeadOffice: string | null
    businessType: string | null
    customerAccessChannel: string | null
    customerStatus: string | null
    customerType: string | null
    district: string | null
    postalCode: string | null
    province: string | null
    subDistrict: string | null
    assignedUserId: string | null
  }

  export type CompanyMaxAggregateOutputType = {
    id: string | null
    companyName: string | null
    taxId: string | null
    address: string | null
    createdAt: Date | null
    updatedAt: Date | null
    area: string | null
    branchOrHeadOffice: string | null
    businessType: string | null
    customerAccessChannel: string | null
    customerStatus: string | null
    customerType: string | null
    district: string | null
    postalCode: string | null
    province: string | null
    subDistrict: string | null
    assignedUserId: string | null
  }

  export type CompanyCountAggregateOutputType = {
    id: number
    companyName: number
    taxId: number
    address: number
    createdAt: number
    updatedAt: number
    area: number
    branchOrHeadOffice: number
    businessType: number
    customerAccessChannel: number
    customerStatus: number
    customerType: number
    district: number
    postalCode: number
    province: number
    subDistrict: number
    assignedUserId: number
    _all: number
  }


  export type CompanyMinAggregateInputType = {
    id?: true
    companyName?: true
    taxId?: true
    address?: true
    createdAt?: true
    updatedAt?: true
    area?: true
    branchOrHeadOffice?: true
    businessType?: true
    customerAccessChannel?: true
    customerStatus?: true
    customerType?: true
    district?: true
    postalCode?: true
    province?: true
    subDistrict?: true
    assignedUserId?: true
  }

  export type CompanyMaxAggregateInputType = {
    id?: true
    companyName?: true
    taxId?: true
    address?: true
    createdAt?: true
    updatedAt?: true
    area?: true
    branchOrHeadOffice?: true
    businessType?: true
    customerAccessChannel?: true
    customerStatus?: true
    customerType?: true
    district?: true
    postalCode?: true
    province?: true
    subDistrict?: true
    assignedUserId?: true
  }

  export type CompanyCountAggregateInputType = {
    id?: true
    companyName?: true
    taxId?: true
    address?: true
    createdAt?: true
    updatedAt?: true
    area?: true
    branchOrHeadOffice?: true
    businessType?: true
    customerAccessChannel?: true
    customerStatus?: true
    customerType?: true
    district?: true
    postalCode?: true
    province?: true
    subDistrict?: true
    assignedUserId?: true
    _all?: true
  }

  export type CompanyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Company to aggregate.
     */
    where?: CompanyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Companies to fetch.
     */
    orderBy?: CompanyOrderByWithRelationInput | CompanyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CompanyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Companies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Companies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Companies
    **/
    _count?: true | CompanyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CompanyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CompanyMaxAggregateInputType
  }

  export type GetCompanyAggregateType<T extends CompanyAggregateArgs> = {
        [P in keyof T & keyof AggregateCompany]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCompany[P]>
      : GetScalarType<T[P], AggregateCompany[P]>
  }




  export type CompanyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CompanyWhereInput
    orderBy?: CompanyOrderByWithAggregationInput | CompanyOrderByWithAggregationInput[]
    by: CompanyScalarFieldEnum[] | CompanyScalarFieldEnum
    having?: CompanyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CompanyCountAggregateInputType | true
    _min?: CompanyMinAggregateInputType
    _max?: CompanyMaxAggregateInputType
  }

  export type CompanyGroupByOutputType = {
    id: string
    companyName: string
    taxId: string | null
    address: string | null
    createdAt: Date
    updatedAt: Date
    area: string | null
    branchOrHeadOffice: string | null
    businessType: string | null
    customerAccessChannel: string | null
    customerStatus: string | null
    customerType: string | null
    district: string | null
    postalCode: string | null
    province: string | null
    subDistrict: string | null
    assignedUserId: string | null
    _count: CompanyCountAggregateOutputType | null
    _min: CompanyMinAggregateOutputType | null
    _max: CompanyMaxAggregateOutputType | null
  }

  type GetCompanyGroupByPayload<T extends CompanyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CompanyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CompanyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CompanyGroupByOutputType[P]>
            : GetScalarType<T[P], CompanyGroupByOutputType[P]>
        }
      >
    >


  export type CompanySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyName?: boolean
    taxId?: boolean
    address?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    area?: boolean
    branchOrHeadOffice?: boolean
    businessType?: boolean
    customerAccessChannel?: boolean
    customerStatus?: boolean
    customerType?: boolean
    district?: boolean
    postalCode?: boolean
    province?: boolean
    subDistrict?: boolean
    assignedUserId?: boolean
    contacts?: boolean | Company$contactsArgs<ExtArgs>
    quotations?: boolean | Company$quotationsArgs<ExtArgs>
    telesales?: boolean | Company$telesalesArgs<ExtArgs>
    schedules?: boolean | Company$schedulesArgs<ExtArgs>
    assignedUser?: boolean | Company$assignedUserArgs<ExtArgs>
    _count?: boolean | CompanyCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["company"]>

  export type CompanySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyName?: boolean
    taxId?: boolean
    address?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    area?: boolean
    branchOrHeadOffice?: boolean
    businessType?: boolean
    customerAccessChannel?: boolean
    customerStatus?: boolean
    customerType?: boolean
    district?: boolean
    postalCode?: boolean
    province?: boolean
    subDistrict?: boolean
    assignedUserId?: boolean
    assignedUser?: boolean | Company$assignedUserArgs<ExtArgs>
  }, ExtArgs["result"]["company"]>

  export type CompanySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyName?: boolean
    taxId?: boolean
    address?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    area?: boolean
    branchOrHeadOffice?: boolean
    businessType?: boolean
    customerAccessChannel?: boolean
    customerStatus?: boolean
    customerType?: boolean
    district?: boolean
    postalCode?: boolean
    province?: boolean
    subDistrict?: boolean
    assignedUserId?: boolean
    assignedUser?: boolean | Company$assignedUserArgs<ExtArgs>
  }, ExtArgs["result"]["company"]>

  export type CompanySelectScalar = {
    id?: boolean
    companyName?: boolean
    taxId?: boolean
    address?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    area?: boolean
    branchOrHeadOffice?: boolean
    businessType?: boolean
    customerAccessChannel?: boolean
    customerStatus?: boolean
    customerType?: boolean
    district?: boolean
    postalCode?: boolean
    province?: boolean
    subDistrict?: boolean
    assignedUserId?: boolean
  }

  export type CompanyOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "companyName" | "taxId" | "address" | "createdAt" | "updatedAt" | "area" | "branchOrHeadOffice" | "businessType" | "customerAccessChannel" | "customerStatus" | "customerType" | "district" | "postalCode" | "province" | "subDistrict" | "assignedUserId", ExtArgs["result"]["company"]>
  export type CompanyInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    contacts?: boolean | Company$contactsArgs<ExtArgs>
    quotations?: boolean | Company$quotationsArgs<ExtArgs>
    telesales?: boolean | Company$telesalesArgs<ExtArgs>
    schedules?: boolean | Company$schedulesArgs<ExtArgs>
    assignedUser?: boolean | Company$assignedUserArgs<ExtArgs>
    _count?: boolean | CompanyCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CompanyIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    assignedUser?: boolean | Company$assignedUserArgs<ExtArgs>
  }
  export type CompanyIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    assignedUser?: boolean | Company$assignedUserArgs<ExtArgs>
  }

  export type $CompanyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Company"
    objects: {
      contacts: Prisma.$ContactPayload<ExtArgs>[]
      quotations: Prisma.$QuotationPayload<ExtArgs>[]
      telesales: Prisma.$TelesalePayload<ExtArgs>[]
      schedules: Prisma.$SchedulePayload<ExtArgs>[]
      assignedUser: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      companyName: string
      taxId: string | null
      address: string | null
      createdAt: Date
      updatedAt: Date
      area: string | null
      branchOrHeadOffice: string | null
      businessType: string | null
      customerAccessChannel: string | null
      customerStatus: string | null
      customerType: string | null
      district: string | null
      postalCode: string | null
      province: string | null
      subDistrict: string | null
      assignedUserId: string | null
    }, ExtArgs["result"]["company"]>
    composites: {}
  }

  type CompanyGetPayload<S extends boolean | null | undefined | CompanyDefaultArgs> = $Result.GetResult<Prisma.$CompanyPayload, S>

  type CompanyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CompanyFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CompanyCountAggregateInputType | true
    }

  export interface CompanyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Company'], meta: { name: 'Company' } }
    /**
     * Find zero or one Company that matches the filter.
     * @param {CompanyFindUniqueArgs} args - Arguments to find a Company
     * @example
     * // Get one Company
     * const company = await prisma.company.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CompanyFindUniqueArgs>(args: SelectSubset<T, CompanyFindUniqueArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Company that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CompanyFindUniqueOrThrowArgs} args - Arguments to find a Company
     * @example
     * // Get one Company
     * const company = await prisma.company.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CompanyFindUniqueOrThrowArgs>(args: SelectSubset<T, CompanyFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Company that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompanyFindFirstArgs} args - Arguments to find a Company
     * @example
     * // Get one Company
     * const company = await prisma.company.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CompanyFindFirstArgs>(args?: SelectSubset<T, CompanyFindFirstArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Company that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompanyFindFirstOrThrowArgs} args - Arguments to find a Company
     * @example
     * // Get one Company
     * const company = await prisma.company.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CompanyFindFirstOrThrowArgs>(args?: SelectSubset<T, CompanyFindFirstOrThrowArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Companies that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompanyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Companies
     * const companies = await prisma.company.findMany()
     * 
     * // Get first 10 Companies
     * const companies = await prisma.company.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const companyWithIdOnly = await prisma.company.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CompanyFindManyArgs>(args?: SelectSubset<T, CompanyFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Company.
     * @param {CompanyCreateArgs} args - Arguments to create a Company.
     * @example
     * // Create one Company
     * const Company = await prisma.company.create({
     *   data: {
     *     // ... data to create a Company
     *   }
     * })
     * 
     */
    create<T extends CompanyCreateArgs>(args: SelectSubset<T, CompanyCreateArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Companies.
     * @param {CompanyCreateManyArgs} args - Arguments to create many Companies.
     * @example
     * // Create many Companies
     * const company = await prisma.company.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CompanyCreateManyArgs>(args?: SelectSubset<T, CompanyCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Companies and returns the data saved in the database.
     * @param {CompanyCreateManyAndReturnArgs} args - Arguments to create many Companies.
     * @example
     * // Create many Companies
     * const company = await prisma.company.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Companies and only return the `id`
     * const companyWithIdOnly = await prisma.company.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CompanyCreateManyAndReturnArgs>(args?: SelectSubset<T, CompanyCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Company.
     * @param {CompanyDeleteArgs} args - Arguments to delete one Company.
     * @example
     * // Delete one Company
     * const Company = await prisma.company.delete({
     *   where: {
     *     // ... filter to delete one Company
     *   }
     * })
     * 
     */
    delete<T extends CompanyDeleteArgs>(args: SelectSubset<T, CompanyDeleteArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Company.
     * @param {CompanyUpdateArgs} args - Arguments to update one Company.
     * @example
     * // Update one Company
     * const company = await prisma.company.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CompanyUpdateArgs>(args: SelectSubset<T, CompanyUpdateArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Companies.
     * @param {CompanyDeleteManyArgs} args - Arguments to filter Companies to delete.
     * @example
     * // Delete a few Companies
     * const { count } = await prisma.company.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CompanyDeleteManyArgs>(args?: SelectSubset<T, CompanyDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Companies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompanyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Companies
     * const company = await prisma.company.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CompanyUpdateManyArgs>(args: SelectSubset<T, CompanyUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Companies and returns the data updated in the database.
     * @param {CompanyUpdateManyAndReturnArgs} args - Arguments to update many Companies.
     * @example
     * // Update many Companies
     * const company = await prisma.company.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Companies and only return the `id`
     * const companyWithIdOnly = await prisma.company.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CompanyUpdateManyAndReturnArgs>(args: SelectSubset<T, CompanyUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Company.
     * @param {CompanyUpsertArgs} args - Arguments to update or create a Company.
     * @example
     * // Update or create a Company
     * const company = await prisma.company.upsert({
     *   create: {
     *     // ... data to create a Company
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Company we want to update
     *   }
     * })
     */
    upsert<T extends CompanyUpsertArgs>(args: SelectSubset<T, CompanyUpsertArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Companies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompanyCountArgs} args - Arguments to filter Companies to count.
     * @example
     * // Count the number of Companies
     * const count = await prisma.company.count({
     *   where: {
     *     // ... the filter for the Companies we want to count
     *   }
     * })
    **/
    count<T extends CompanyCountArgs>(
      args?: Subset<T, CompanyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CompanyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Company.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompanyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CompanyAggregateArgs>(args: Subset<T, CompanyAggregateArgs>): Prisma.PrismaPromise<GetCompanyAggregateType<T>>

    /**
     * Group by Company.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompanyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CompanyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CompanyGroupByArgs['orderBy'] }
        : { orderBy?: CompanyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CompanyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCompanyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Company model
   */
  readonly fields: CompanyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Company.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CompanyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    contacts<T extends Company$contactsArgs<ExtArgs> = {}>(args?: Subset<T, Company$contactsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    quotations<T extends Company$quotationsArgs<ExtArgs> = {}>(args?: Subset<T, Company$quotationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    telesales<T extends Company$telesalesArgs<ExtArgs> = {}>(args?: Subset<T, Company$telesalesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    schedules<T extends Company$schedulesArgs<ExtArgs> = {}>(args?: Subset<T, Company$schedulesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SchedulePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    assignedUser<T extends Company$assignedUserArgs<ExtArgs> = {}>(args?: Subset<T, Company$assignedUserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Company model
   */
  interface CompanyFieldRefs {
    readonly id: FieldRef<"Company", 'String'>
    readonly companyName: FieldRef<"Company", 'String'>
    readonly taxId: FieldRef<"Company", 'String'>
    readonly address: FieldRef<"Company", 'String'>
    readonly createdAt: FieldRef<"Company", 'DateTime'>
    readonly updatedAt: FieldRef<"Company", 'DateTime'>
    readonly area: FieldRef<"Company", 'String'>
    readonly branchOrHeadOffice: FieldRef<"Company", 'String'>
    readonly businessType: FieldRef<"Company", 'String'>
    readonly customerAccessChannel: FieldRef<"Company", 'String'>
    readonly customerStatus: FieldRef<"Company", 'String'>
    readonly customerType: FieldRef<"Company", 'String'>
    readonly district: FieldRef<"Company", 'String'>
    readonly postalCode: FieldRef<"Company", 'String'>
    readonly province: FieldRef<"Company", 'String'>
    readonly subDistrict: FieldRef<"Company", 'String'>
    readonly assignedUserId: FieldRef<"Company", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Company findUnique
   */
  export type CompanyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * Filter, which Company to fetch.
     */
    where: CompanyWhereUniqueInput
  }

  /**
   * Company findUniqueOrThrow
   */
  export type CompanyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * Filter, which Company to fetch.
     */
    where: CompanyWhereUniqueInput
  }

  /**
   * Company findFirst
   */
  export type CompanyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * Filter, which Company to fetch.
     */
    where?: CompanyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Companies to fetch.
     */
    orderBy?: CompanyOrderByWithRelationInput | CompanyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Companies.
     */
    cursor?: CompanyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Companies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Companies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Companies.
     */
    distinct?: CompanyScalarFieldEnum | CompanyScalarFieldEnum[]
  }

  /**
   * Company findFirstOrThrow
   */
  export type CompanyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * Filter, which Company to fetch.
     */
    where?: CompanyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Companies to fetch.
     */
    orderBy?: CompanyOrderByWithRelationInput | CompanyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Companies.
     */
    cursor?: CompanyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Companies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Companies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Companies.
     */
    distinct?: CompanyScalarFieldEnum | CompanyScalarFieldEnum[]
  }

  /**
   * Company findMany
   */
  export type CompanyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * Filter, which Companies to fetch.
     */
    where?: CompanyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Companies to fetch.
     */
    orderBy?: CompanyOrderByWithRelationInput | CompanyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Companies.
     */
    cursor?: CompanyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Companies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Companies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Companies.
     */
    distinct?: CompanyScalarFieldEnum | CompanyScalarFieldEnum[]
  }

  /**
   * Company create
   */
  export type CompanyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * The data needed to create a Company.
     */
    data: XOR<CompanyCreateInput, CompanyUncheckedCreateInput>
  }

  /**
   * Company createMany
   */
  export type CompanyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Companies.
     */
    data: CompanyCreateManyInput | CompanyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Company createManyAndReturn
   */
  export type CompanyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * The data used to create many Companies.
     */
    data: CompanyCreateManyInput | CompanyCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Company update
   */
  export type CompanyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * The data needed to update a Company.
     */
    data: XOR<CompanyUpdateInput, CompanyUncheckedUpdateInput>
    /**
     * Choose, which Company to update.
     */
    where: CompanyWhereUniqueInput
  }

  /**
   * Company updateMany
   */
  export type CompanyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Companies.
     */
    data: XOR<CompanyUpdateManyMutationInput, CompanyUncheckedUpdateManyInput>
    /**
     * Filter which Companies to update
     */
    where?: CompanyWhereInput
    /**
     * Limit how many Companies to update.
     */
    limit?: number
  }

  /**
   * Company updateManyAndReturn
   */
  export type CompanyUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * The data used to update Companies.
     */
    data: XOR<CompanyUpdateManyMutationInput, CompanyUncheckedUpdateManyInput>
    /**
     * Filter which Companies to update
     */
    where?: CompanyWhereInput
    /**
     * Limit how many Companies to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Company upsert
   */
  export type CompanyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * The filter to search for the Company to update in case it exists.
     */
    where: CompanyWhereUniqueInput
    /**
     * In case the Company found by the `where` argument doesn't exist, create a new Company with this data.
     */
    create: XOR<CompanyCreateInput, CompanyUncheckedCreateInput>
    /**
     * In case the Company was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CompanyUpdateInput, CompanyUncheckedUpdateInput>
  }

  /**
   * Company delete
   */
  export type CompanyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
    /**
     * Filter which Company to delete.
     */
    where: CompanyWhereUniqueInput
  }

  /**
   * Company deleteMany
   */
  export type CompanyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Companies to delete
     */
    where?: CompanyWhereInput
    /**
     * Limit how many Companies to delete.
     */
    limit?: number
  }

  /**
   * Company.contacts
   */
  export type Company$contactsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    where?: ContactWhereInput
    orderBy?: ContactOrderByWithRelationInput | ContactOrderByWithRelationInput[]
    cursor?: ContactWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ContactScalarFieldEnum | ContactScalarFieldEnum[]
  }

  /**
   * Company.quotations
   */
  export type Company$quotationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    where?: QuotationWhereInput
    orderBy?: QuotationOrderByWithRelationInput | QuotationOrderByWithRelationInput[]
    cursor?: QuotationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: QuotationScalarFieldEnum | QuotationScalarFieldEnum[]
  }

  /**
   * Company.telesales
   */
  export type Company$telesalesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    where?: TelesaleWhereInput
    orderBy?: TelesaleOrderByWithRelationInput | TelesaleOrderByWithRelationInput[]
    cursor?: TelesaleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TelesaleScalarFieldEnum | TelesaleScalarFieldEnum[]
  }

  /**
   * Company.schedules
   */
  export type Company$schedulesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Schedule
     */
    select?: ScheduleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Schedule
     */
    omit?: ScheduleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ScheduleInclude<ExtArgs> | null
    where?: ScheduleWhereInput
    orderBy?: ScheduleOrderByWithRelationInput | ScheduleOrderByWithRelationInput[]
    cursor?: ScheduleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ScheduleScalarFieldEnum | ScheduleScalarFieldEnum[]
  }

  /**
   * Company.assignedUser
   */
  export type Company$assignedUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Company without action
   */
  export type CompanyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Company
     */
    select?: CompanySelect<ExtArgs> | null
    /**
     * Omit specific fields from the Company
     */
    omit?: CompanyOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CompanyInclude<ExtArgs> | null
  }


  /**
   * Model Contact
   */

  export type AggregateContact = {
    _count: ContactCountAggregateOutputType | null
    _min: ContactMinAggregateOutputType | null
    _max: ContactMaxAggregateOutputType | null
  }

  export type ContactMinAggregateOutputType = {
    id: string | null
    companyId: string | null
    contactName: string | null
    position: string | null
    mobilePhone: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ContactMaxAggregateOutputType = {
    id: string | null
    companyId: string | null
    contactName: string | null
    position: string | null
    mobilePhone: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ContactCountAggregateOutputType = {
    id: number
    companyId: number
    contactName: number
    position: number
    mobilePhone: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ContactMinAggregateInputType = {
    id?: true
    companyId?: true
    contactName?: true
    position?: true
    mobilePhone?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ContactMaxAggregateInputType = {
    id?: true
    companyId?: true
    contactName?: true
    position?: true
    mobilePhone?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ContactCountAggregateInputType = {
    id?: true
    companyId?: true
    contactName?: true
    position?: true
    mobilePhone?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ContactAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Contact to aggregate.
     */
    where?: ContactWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Contacts to fetch.
     */
    orderBy?: ContactOrderByWithRelationInput | ContactOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ContactWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Contacts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Contacts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Contacts
    **/
    _count?: true | ContactCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ContactMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ContactMaxAggregateInputType
  }

  export type GetContactAggregateType<T extends ContactAggregateArgs> = {
        [P in keyof T & keyof AggregateContact]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateContact[P]>
      : GetScalarType<T[P], AggregateContact[P]>
  }




  export type ContactGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContactWhereInput
    orderBy?: ContactOrderByWithAggregationInput | ContactOrderByWithAggregationInput[]
    by: ContactScalarFieldEnum[] | ContactScalarFieldEnum
    having?: ContactScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ContactCountAggregateInputType | true
    _min?: ContactMinAggregateInputType
    _max?: ContactMaxAggregateInputType
  }

  export type ContactGroupByOutputType = {
    id: string
    companyId: string
    contactName: string
    position: string | null
    mobilePhone: string | null
    createdAt: Date
    updatedAt: Date
    _count: ContactCountAggregateOutputType | null
    _min: ContactMinAggregateOutputType | null
    _max: ContactMaxAggregateOutputType | null
  }

  type GetContactGroupByPayload<T extends ContactGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ContactGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ContactGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ContactGroupByOutputType[P]>
            : GetScalarType<T[P], ContactGroupByOutputType[P]>
        }
      >
    >


  export type ContactSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    contactName?: boolean
    position?: boolean
    mobilePhone?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    quotations?: boolean | Contact$quotationsArgs<ExtArgs>
    _count?: boolean | ContactCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contact"]>

  export type ContactSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    contactName?: boolean
    position?: boolean
    mobilePhone?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contact"]>

  export type ContactSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    contactName?: boolean
    position?: boolean
    mobilePhone?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contact"]>

  export type ContactSelectScalar = {
    id?: boolean
    companyId?: boolean
    contactName?: boolean
    position?: boolean
    mobilePhone?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ContactOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "companyId" | "contactName" | "position" | "mobilePhone" | "createdAt" | "updatedAt", ExtArgs["result"]["contact"]>
  export type ContactInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    quotations?: boolean | Contact$quotationsArgs<ExtArgs>
    _count?: boolean | ContactCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ContactIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
  }
  export type ContactIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
  }

  export type $ContactPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Contact"
    objects: {
      company: Prisma.$CompanyPayload<ExtArgs>
      quotations: Prisma.$QuotationPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      companyId: string
      contactName: string
      position: string | null
      mobilePhone: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["contact"]>
    composites: {}
  }

  type ContactGetPayload<S extends boolean | null | undefined | ContactDefaultArgs> = $Result.GetResult<Prisma.$ContactPayload, S>

  type ContactCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ContactFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ContactCountAggregateInputType | true
    }

  export interface ContactDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Contact'], meta: { name: 'Contact' } }
    /**
     * Find zero or one Contact that matches the filter.
     * @param {ContactFindUniqueArgs} args - Arguments to find a Contact
     * @example
     * // Get one Contact
     * const contact = await prisma.contact.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ContactFindUniqueArgs>(args: SelectSubset<T, ContactFindUniqueArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Contact that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ContactFindUniqueOrThrowArgs} args - Arguments to find a Contact
     * @example
     * // Get one Contact
     * const contact = await prisma.contact.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ContactFindUniqueOrThrowArgs>(args: SelectSubset<T, ContactFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Contact that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContactFindFirstArgs} args - Arguments to find a Contact
     * @example
     * // Get one Contact
     * const contact = await prisma.contact.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ContactFindFirstArgs>(args?: SelectSubset<T, ContactFindFirstArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Contact that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContactFindFirstOrThrowArgs} args - Arguments to find a Contact
     * @example
     * // Get one Contact
     * const contact = await prisma.contact.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ContactFindFirstOrThrowArgs>(args?: SelectSubset<T, ContactFindFirstOrThrowArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Contacts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContactFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Contacts
     * const contacts = await prisma.contact.findMany()
     * 
     * // Get first 10 Contacts
     * const contacts = await prisma.contact.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const contactWithIdOnly = await prisma.contact.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ContactFindManyArgs>(args?: SelectSubset<T, ContactFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Contact.
     * @param {ContactCreateArgs} args - Arguments to create a Contact.
     * @example
     * // Create one Contact
     * const Contact = await prisma.contact.create({
     *   data: {
     *     // ... data to create a Contact
     *   }
     * })
     * 
     */
    create<T extends ContactCreateArgs>(args: SelectSubset<T, ContactCreateArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Contacts.
     * @param {ContactCreateManyArgs} args - Arguments to create many Contacts.
     * @example
     * // Create many Contacts
     * const contact = await prisma.contact.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ContactCreateManyArgs>(args?: SelectSubset<T, ContactCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Contacts and returns the data saved in the database.
     * @param {ContactCreateManyAndReturnArgs} args - Arguments to create many Contacts.
     * @example
     * // Create many Contacts
     * const contact = await prisma.contact.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Contacts and only return the `id`
     * const contactWithIdOnly = await prisma.contact.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ContactCreateManyAndReturnArgs>(args?: SelectSubset<T, ContactCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Contact.
     * @param {ContactDeleteArgs} args - Arguments to delete one Contact.
     * @example
     * // Delete one Contact
     * const Contact = await prisma.contact.delete({
     *   where: {
     *     // ... filter to delete one Contact
     *   }
     * })
     * 
     */
    delete<T extends ContactDeleteArgs>(args: SelectSubset<T, ContactDeleteArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Contact.
     * @param {ContactUpdateArgs} args - Arguments to update one Contact.
     * @example
     * // Update one Contact
     * const contact = await prisma.contact.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ContactUpdateArgs>(args: SelectSubset<T, ContactUpdateArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Contacts.
     * @param {ContactDeleteManyArgs} args - Arguments to filter Contacts to delete.
     * @example
     * // Delete a few Contacts
     * const { count } = await prisma.contact.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ContactDeleteManyArgs>(args?: SelectSubset<T, ContactDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Contacts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContactUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Contacts
     * const contact = await prisma.contact.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ContactUpdateManyArgs>(args: SelectSubset<T, ContactUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Contacts and returns the data updated in the database.
     * @param {ContactUpdateManyAndReturnArgs} args - Arguments to update many Contacts.
     * @example
     * // Update many Contacts
     * const contact = await prisma.contact.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Contacts and only return the `id`
     * const contactWithIdOnly = await prisma.contact.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ContactUpdateManyAndReturnArgs>(args: SelectSubset<T, ContactUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Contact.
     * @param {ContactUpsertArgs} args - Arguments to update or create a Contact.
     * @example
     * // Update or create a Contact
     * const contact = await prisma.contact.upsert({
     *   create: {
     *     // ... data to create a Contact
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Contact we want to update
     *   }
     * })
     */
    upsert<T extends ContactUpsertArgs>(args: SelectSubset<T, ContactUpsertArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Contacts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContactCountArgs} args - Arguments to filter Contacts to count.
     * @example
     * // Count the number of Contacts
     * const count = await prisma.contact.count({
     *   where: {
     *     // ... the filter for the Contacts we want to count
     *   }
     * })
    **/
    count<T extends ContactCountArgs>(
      args?: Subset<T, ContactCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ContactCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Contact.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContactAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ContactAggregateArgs>(args: Subset<T, ContactAggregateArgs>): Prisma.PrismaPromise<GetContactAggregateType<T>>

    /**
     * Group by Contact.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContactGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ContactGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ContactGroupByArgs['orderBy'] }
        : { orderBy?: ContactGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ContactGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetContactGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Contact model
   */
  readonly fields: ContactFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Contact.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ContactClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    company<T extends CompanyDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CompanyDefaultArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    quotations<T extends Contact$quotationsArgs<ExtArgs> = {}>(args?: Subset<T, Contact$quotationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Contact model
   */
  interface ContactFieldRefs {
    readonly id: FieldRef<"Contact", 'String'>
    readonly companyId: FieldRef<"Contact", 'String'>
    readonly contactName: FieldRef<"Contact", 'String'>
    readonly position: FieldRef<"Contact", 'String'>
    readonly mobilePhone: FieldRef<"Contact", 'String'>
    readonly createdAt: FieldRef<"Contact", 'DateTime'>
    readonly updatedAt: FieldRef<"Contact", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Contact findUnique
   */
  export type ContactFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * Filter, which Contact to fetch.
     */
    where: ContactWhereUniqueInput
  }

  /**
   * Contact findUniqueOrThrow
   */
  export type ContactFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * Filter, which Contact to fetch.
     */
    where: ContactWhereUniqueInput
  }

  /**
   * Contact findFirst
   */
  export type ContactFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * Filter, which Contact to fetch.
     */
    where?: ContactWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Contacts to fetch.
     */
    orderBy?: ContactOrderByWithRelationInput | ContactOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Contacts.
     */
    cursor?: ContactWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Contacts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Contacts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Contacts.
     */
    distinct?: ContactScalarFieldEnum | ContactScalarFieldEnum[]
  }

  /**
   * Contact findFirstOrThrow
   */
  export type ContactFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * Filter, which Contact to fetch.
     */
    where?: ContactWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Contacts to fetch.
     */
    orderBy?: ContactOrderByWithRelationInput | ContactOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Contacts.
     */
    cursor?: ContactWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Contacts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Contacts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Contacts.
     */
    distinct?: ContactScalarFieldEnum | ContactScalarFieldEnum[]
  }

  /**
   * Contact findMany
   */
  export type ContactFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * Filter, which Contacts to fetch.
     */
    where?: ContactWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Contacts to fetch.
     */
    orderBy?: ContactOrderByWithRelationInput | ContactOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Contacts.
     */
    cursor?: ContactWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Contacts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Contacts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Contacts.
     */
    distinct?: ContactScalarFieldEnum | ContactScalarFieldEnum[]
  }

  /**
   * Contact create
   */
  export type ContactCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * The data needed to create a Contact.
     */
    data: XOR<ContactCreateInput, ContactUncheckedCreateInput>
  }

  /**
   * Contact createMany
   */
  export type ContactCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Contacts.
     */
    data: ContactCreateManyInput | ContactCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Contact createManyAndReturn
   */
  export type ContactCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * The data used to create many Contacts.
     */
    data: ContactCreateManyInput | ContactCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Contact update
   */
  export type ContactUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * The data needed to update a Contact.
     */
    data: XOR<ContactUpdateInput, ContactUncheckedUpdateInput>
    /**
     * Choose, which Contact to update.
     */
    where: ContactWhereUniqueInput
  }

  /**
   * Contact updateMany
   */
  export type ContactUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Contacts.
     */
    data: XOR<ContactUpdateManyMutationInput, ContactUncheckedUpdateManyInput>
    /**
     * Filter which Contacts to update
     */
    where?: ContactWhereInput
    /**
     * Limit how many Contacts to update.
     */
    limit?: number
  }

  /**
   * Contact updateManyAndReturn
   */
  export type ContactUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * The data used to update Contacts.
     */
    data: XOR<ContactUpdateManyMutationInput, ContactUncheckedUpdateManyInput>
    /**
     * Filter which Contacts to update
     */
    where?: ContactWhereInput
    /**
     * Limit how many Contacts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Contact upsert
   */
  export type ContactUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * The filter to search for the Contact to update in case it exists.
     */
    where: ContactWhereUniqueInput
    /**
     * In case the Contact found by the `where` argument doesn't exist, create a new Contact with this data.
     */
    create: XOR<ContactCreateInput, ContactUncheckedCreateInput>
    /**
     * In case the Contact was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ContactUpdateInput, ContactUncheckedUpdateInput>
  }

  /**
   * Contact delete
   */
  export type ContactDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    /**
     * Filter which Contact to delete.
     */
    where: ContactWhereUniqueInput
  }

  /**
   * Contact deleteMany
   */
  export type ContactDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Contacts to delete
     */
    where?: ContactWhereInput
    /**
     * Limit how many Contacts to delete.
     */
    limit?: number
  }

  /**
   * Contact.quotations
   */
  export type Contact$quotationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    where?: QuotationWhereInput
    orderBy?: QuotationOrderByWithRelationInput | QuotationOrderByWithRelationInput[]
    cursor?: QuotationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: QuotationScalarFieldEnum | QuotationScalarFieldEnum[]
  }

  /**
   * Contact without action
   */
  export type ContactDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
  }


  /**
   * Model Quotation
   */

  export type AggregateQuotation = {
    _count: QuotationCountAggregateOutputType | null
    _avg: QuotationAvgAggregateOutputType | null
    _sum: QuotationSumAggregateOutputType | null
    _min: QuotationMinAggregateOutputType | null
    _max: QuotationMaxAggregateOutputType | null
  }

  export type QuotationAvgAggregateOutputType = {
    salesBeforeVat: number | null
    transportationFee: number | null
    installationFee: number | null
    totalAmountBeforeVat: number | null
    actualClosingAmount: number | null
  }

  export type QuotationSumAggregateOutputType = {
    salesBeforeVat: number | null
    transportationFee: number | null
    installationFee: number | null
    totalAmountBeforeVat: number | null
    actualClosingAmount: number | null
  }

  export type QuotationMinAggregateOutputType = {
    id: string | null
    companyId: string | null
    status: string | null
    salesBeforeVat: number | null
    transportationFee: number | null
    installationFee: number | null
    totalAmountBeforeVat: number | null
    actualClosingAmount: number | null
    createdAt: Date | null
    updatedAt: Date | null
    billingDate: Date | null
    contactId: string | null
    followUp1: Date | null
    followUp2: Date | null
    followUp3: Date | null
    followUp4: Date | null
    invoiceNumber: string | null
    poDate: Date | null
    productType: string | null
    quotationDate: Date | null
    quotationNumber: string | null
    rejectReason: string | null
    remarks: string | null
    requirementDate: Date | null
    requirementNumber: string | null
    salesBranch: string | null
    salesTeamLeader: string | null
    salespersonId: string | null
    subject: string | null
    winLossReason: string | null
  }

  export type QuotationMaxAggregateOutputType = {
    id: string | null
    companyId: string | null
    status: string | null
    salesBeforeVat: number | null
    transportationFee: number | null
    installationFee: number | null
    totalAmountBeforeVat: number | null
    actualClosingAmount: number | null
    createdAt: Date | null
    updatedAt: Date | null
    billingDate: Date | null
    contactId: string | null
    followUp1: Date | null
    followUp2: Date | null
    followUp3: Date | null
    followUp4: Date | null
    invoiceNumber: string | null
    poDate: Date | null
    productType: string | null
    quotationDate: Date | null
    quotationNumber: string | null
    rejectReason: string | null
    remarks: string | null
    requirementDate: Date | null
    requirementNumber: string | null
    salesBranch: string | null
    salesTeamLeader: string | null
    salespersonId: string | null
    subject: string | null
    winLossReason: string | null
  }

  export type QuotationCountAggregateOutputType = {
    id: number
    companyId: number
    status: number
    salesBeforeVat: number
    transportationFee: number
    installationFee: number
    totalAmountBeforeVat: number
    actualClosingAmount: number
    createdAt: number
    updatedAt: number
    billingDate: number
    contactId: number
    followUp1: number
    followUp2: number
    followUp3: number
    followUp4: number
    invoiceNumber: number
    poDate: number
    productType: number
    quotationDate: number
    quotationNumber: number
    rejectReason: number
    remarks: number
    requirementDate: number
    requirementNumber: number
    salesBranch: number
    salesTeamLeader: number
    salespersonId: number
    subject: number
    winLossReason: number
    _all: number
  }


  export type QuotationAvgAggregateInputType = {
    salesBeforeVat?: true
    transportationFee?: true
    installationFee?: true
    totalAmountBeforeVat?: true
    actualClosingAmount?: true
  }

  export type QuotationSumAggregateInputType = {
    salesBeforeVat?: true
    transportationFee?: true
    installationFee?: true
    totalAmountBeforeVat?: true
    actualClosingAmount?: true
  }

  export type QuotationMinAggregateInputType = {
    id?: true
    companyId?: true
    status?: true
    salesBeforeVat?: true
    transportationFee?: true
    installationFee?: true
    totalAmountBeforeVat?: true
    actualClosingAmount?: true
    createdAt?: true
    updatedAt?: true
    billingDate?: true
    contactId?: true
    followUp1?: true
    followUp2?: true
    followUp3?: true
    followUp4?: true
    invoiceNumber?: true
    poDate?: true
    productType?: true
    quotationDate?: true
    quotationNumber?: true
    rejectReason?: true
    remarks?: true
    requirementDate?: true
    requirementNumber?: true
    salesBranch?: true
    salesTeamLeader?: true
    salespersonId?: true
    subject?: true
    winLossReason?: true
  }

  export type QuotationMaxAggregateInputType = {
    id?: true
    companyId?: true
    status?: true
    salesBeforeVat?: true
    transportationFee?: true
    installationFee?: true
    totalAmountBeforeVat?: true
    actualClosingAmount?: true
    createdAt?: true
    updatedAt?: true
    billingDate?: true
    contactId?: true
    followUp1?: true
    followUp2?: true
    followUp3?: true
    followUp4?: true
    invoiceNumber?: true
    poDate?: true
    productType?: true
    quotationDate?: true
    quotationNumber?: true
    rejectReason?: true
    remarks?: true
    requirementDate?: true
    requirementNumber?: true
    salesBranch?: true
    salesTeamLeader?: true
    salespersonId?: true
    subject?: true
    winLossReason?: true
  }

  export type QuotationCountAggregateInputType = {
    id?: true
    companyId?: true
    status?: true
    salesBeforeVat?: true
    transportationFee?: true
    installationFee?: true
    totalAmountBeforeVat?: true
    actualClosingAmount?: true
    createdAt?: true
    updatedAt?: true
    billingDate?: true
    contactId?: true
    followUp1?: true
    followUp2?: true
    followUp3?: true
    followUp4?: true
    invoiceNumber?: true
    poDate?: true
    productType?: true
    quotationDate?: true
    quotationNumber?: true
    rejectReason?: true
    remarks?: true
    requirementDate?: true
    requirementNumber?: true
    salesBranch?: true
    salesTeamLeader?: true
    salespersonId?: true
    subject?: true
    winLossReason?: true
    _all?: true
  }

  export type QuotationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Quotation to aggregate.
     */
    where?: QuotationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Quotations to fetch.
     */
    orderBy?: QuotationOrderByWithRelationInput | QuotationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: QuotationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Quotations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Quotations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Quotations
    **/
    _count?: true | QuotationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: QuotationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: QuotationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: QuotationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: QuotationMaxAggregateInputType
  }

  export type GetQuotationAggregateType<T extends QuotationAggregateArgs> = {
        [P in keyof T & keyof AggregateQuotation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateQuotation[P]>
      : GetScalarType<T[P], AggregateQuotation[P]>
  }




  export type QuotationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QuotationWhereInput
    orderBy?: QuotationOrderByWithAggregationInput | QuotationOrderByWithAggregationInput[]
    by: QuotationScalarFieldEnum[] | QuotationScalarFieldEnum
    having?: QuotationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: QuotationCountAggregateInputType | true
    _avg?: QuotationAvgAggregateInputType
    _sum?: QuotationSumAggregateInputType
    _min?: QuotationMinAggregateInputType
    _max?: QuotationMaxAggregateInputType
  }

  export type QuotationGroupByOutputType = {
    id: string
    companyId: string
    status: string
    salesBeforeVat: number | null
    transportationFee: number | null
    installationFee: number | null
    totalAmountBeforeVat: number | null
    actualClosingAmount: number | null
    createdAt: Date
    updatedAt: Date
    billingDate: Date | null
    contactId: string | null
    followUp1: Date | null
    followUp2: Date | null
    followUp3: Date | null
    followUp4: Date | null
    invoiceNumber: string | null
    poDate: Date | null
    productType: string | null
    quotationDate: Date | null
    quotationNumber: string | null
    rejectReason: string | null
    remarks: string | null
    requirementDate: Date | null
    requirementNumber: string | null
    salesBranch: string | null
    salesTeamLeader: string | null
    salespersonId: string | null
    subject: string | null
    winLossReason: string | null
    _count: QuotationCountAggregateOutputType | null
    _avg: QuotationAvgAggregateOutputType | null
    _sum: QuotationSumAggregateOutputType | null
    _min: QuotationMinAggregateOutputType | null
    _max: QuotationMaxAggregateOutputType | null
  }

  type GetQuotationGroupByPayload<T extends QuotationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<QuotationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof QuotationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], QuotationGroupByOutputType[P]>
            : GetScalarType<T[P], QuotationGroupByOutputType[P]>
        }
      >
    >


  export type QuotationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    status?: boolean
    salesBeforeVat?: boolean
    transportationFee?: boolean
    installationFee?: boolean
    totalAmountBeforeVat?: boolean
    actualClosingAmount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    billingDate?: boolean
    contactId?: boolean
    followUp1?: boolean
    followUp2?: boolean
    followUp3?: boolean
    followUp4?: boolean
    invoiceNumber?: boolean
    poDate?: boolean
    productType?: boolean
    quotationDate?: boolean
    quotationNumber?: boolean
    rejectReason?: boolean
    remarks?: boolean
    requirementDate?: boolean
    requirementNumber?: boolean
    salesBranch?: boolean
    salesTeamLeader?: boolean
    salespersonId?: boolean
    subject?: boolean
    winLossReason?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    contact?: boolean | Quotation$contactArgs<ExtArgs>
    salesperson?: boolean | Quotation$salespersonArgs<ExtArgs>
  }, ExtArgs["result"]["quotation"]>

  export type QuotationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    status?: boolean
    salesBeforeVat?: boolean
    transportationFee?: boolean
    installationFee?: boolean
    totalAmountBeforeVat?: boolean
    actualClosingAmount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    billingDate?: boolean
    contactId?: boolean
    followUp1?: boolean
    followUp2?: boolean
    followUp3?: boolean
    followUp4?: boolean
    invoiceNumber?: boolean
    poDate?: boolean
    productType?: boolean
    quotationDate?: boolean
    quotationNumber?: boolean
    rejectReason?: boolean
    remarks?: boolean
    requirementDate?: boolean
    requirementNumber?: boolean
    salesBranch?: boolean
    salesTeamLeader?: boolean
    salespersonId?: boolean
    subject?: boolean
    winLossReason?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    contact?: boolean | Quotation$contactArgs<ExtArgs>
    salesperson?: boolean | Quotation$salespersonArgs<ExtArgs>
  }, ExtArgs["result"]["quotation"]>

  export type QuotationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    status?: boolean
    salesBeforeVat?: boolean
    transportationFee?: boolean
    installationFee?: boolean
    totalAmountBeforeVat?: boolean
    actualClosingAmount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    billingDate?: boolean
    contactId?: boolean
    followUp1?: boolean
    followUp2?: boolean
    followUp3?: boolean
    followUp4?: boolean
    invoiceNumber?: boolean
    poDate?: boolean
    productType?: boolean
    quotationDate?: boolean
    quotationNumber?: boolean
    rejectReason?: boolean
    remarks?: boolean
    requirementDate?: boolean
    requirementNumber?: boolean
    salesBranch?: boolean
    salesTeamLeader?: boolean
    salespersonId?: boolean
    subject?: boolean
    winLossReason?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    contact?: boolean | Quotation$contactArgs<ExtArgs>
    salesperson?: boolean | Quotation$salespersonArgs<ExtArgs>
  }, ExtArgs["result"]["quotation"]>

  export type QuotationSelectScalar = {
    id?: boolean
    companyId?: boolean
    status?: boolean
    salesBeforeVat?: boolean
    transportationFee?: boolean
    installationFee?: boolean
    totalAmountBeforeVat?: boolean
    actualClosingAmount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    billingDate?: boolean
    contactId?: boolean
    followUp1?: boolean
    followUp2?: boolean
    followUp3?: boolean
    followUp4?: boolean
    invoiceNumber?: boolean
    poDate?: boolean
    productType?: boolean
    quotationDate?: boolean
    quotationNumber?: boolean
    rejectReason?: boolean
    remarks?: boolean
    requirementDate?: boolean
    requirementNumber?: boolean
    salesBranch?: boolean
    salesTeamLeader?: boolean
    salespersonId?: boolean
    subject?: boolean
    winLossReason?: boolean
  }

  export type QuotationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "companyId" | "status" | "salesBeforeVat" | "transportationFee" | "installationFee" | "totalAmountBeforeVat" | "actualClosingAmount" | "createdAt" | "updatedAt" | "billingDate" | "contactId" | "followUp1" | "followUp2" | "followUp3" | "followUp4" | "invoiceNumber" | "poDate" | "productType" | "quotationDate" | "quotationNumber" | "rejectReason" | "remarks" | "requirementDate" | "requirementNumber" | "salesBranch" | "salesTeamLeader" | "salespersonId" | "subject" | "winLossReason", ExtArgs["result"]["quotation"]>
  export type QuotationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    contact?: boolean | Quotation$contactArgs<ExtArgs>
    salesperson?: boolean | Quotation$salespersonArgs<ExtArgs>
  }
  export type QuotationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    contact?: boolean | Quotation$contactArgs<ExtArgs>
    salesperson?: boolean | Quotation$salespersonArgs<ExtArgs>
  }
  export type QuotationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    contact?: boolean | Quotation$contactArgs<ExtArgs>
    salesperson?: boolean | Quotation$salespersonArgs<ExtArgs>
  }

  export type $QuotationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Quotation"
    objects: {
      company: Prisma.$CompanyPayload<ExtArgs>
      contact: Prisma.$ContactPayload<ExtArgs> | null
      salesperson: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      companyId: string
      status: string
      salesBeforeVat: number | null
      transportationFee: number | null
      installationFee: number | null
      totalAmountBeforeVat: number | null
      actualClosingAmount: number | null
      createdAt: Date
      updatedAt: Date
      billingDate: Date | null
      contactId: string | null
      followUp1: Date | null
      followUp2: Date | null
      followUp3: Date | null
      followUp4: Date | null
      invoiceNumber: string | null
      poDate: Date | null
      productType: string | null
      quotationDate: Date | null
      quotationNumber: string | null
      rejectReason: string | null
      remarks: string | null
      requirementDate: Date | null
      requirementNumber: string | null
      salesBranch: string | null
      salesTeamLeader: string | null
      salespersonId: string | null
      subject: string | null
      winLossReason: string | null
    }, ExtArgs["result"]["quotation"]>
    composites: {}
  }

  type QuotationGetPayload<S extends boolean | null | undefined | QuotationDefaultArgs> = $Result.GetResult<Prisma.$QuotationPayload, S>

  type QuotationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<QuotationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: QuotationCountAggregateInputType | true
    }

  export interface QuotationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Quotation'], meta: { name: 'Quotation' } }
    /**
     * Find zero or one Quotation that matches the filter.
     * @param {QuotationFindUniqueArgs} args - Arguments to find a Quotation
     * @example
     * // Get one Quotation
     * const quotation = await prisma.quotation.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends QuotationFindUniqueArgs>(args: SelectSubset<T, QuotationFindUniqueArgs<ExtArgs>>): Prisma__QuotationClient<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Quotation that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {QuotationFindUniqueOrThrowArgs} args - Arguments to find a Quotation
     * @example
     * // Get one Quotation
     * const quotation = await prisma.quotation.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends QuotationFindUniqueOrThrowArgs>(args: SelectSubset<T, QuotationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__QuotationClient<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Quotation that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuotationFindFirstArgs} args - Arguments to find a Quotation
     * @example
     * // Get one Quotation
     * const quotation = await prisma.quotation.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends QuotationFindFirstArgs>(args?: SelectSubset<T, QuotationFindFirstArgs<ExtArgs>>): Prisma__QuotationClient<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Quotation that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuotationFindFirstOrThrowArgs} args - Arguments to find a Quotation
     * @example
     * // Get one Quotation
     * const quotation = await prisma.quotation.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends QuotationFindFirstOrThrowArgs>(args?: SelectSubset<T, QuotationFindFirstOrThrowArgs<ExtArgs>>): Prisma__QuotationClient<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Quotations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuotationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Quotations
     * const quotations = await prisma.quotation.findMany()
     * 
     * // Get first 10 Quotations
     * const quotations = await prisma.quotation.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const quotationWithIdOnly = await prisma.quotation.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends QuotationFindManyArgs>(args?: SelectSubset<T, QuotationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Quotation.
     * @param {QuotationCreateArgs} args - Arguments to create a Quotation.
     * @example
     * // Create one Quotation
     * const Quotation = await prisma.quotation.create({
     *   data: {
     *     // ... data to create a Quotation
     *   }
     * })
     * 
     */
    create<T extends QuotationCreateArgs>(args: SelectSubset<T, QuotationCreateArgs<ExtArgs>>): Prisma__QuotationClient<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Quotations.
     * @param {QuotationCreateManyArgs} args - Arguments to create many Quotations.
     * @example
     * // Create many Quotations
     * const quotation = await prisma.quotation.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends QuotationCreateManyArgs>(args?: SelectSubset<T, QuotationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Quotations and returns the data saved in the database.
     * @param {QuotationCreateManyAndReturnArgs} args - Arguments to create many Quotations.
     * @example
     * // Create many Quotations
     * const quotation = await prisma.quotation.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Quotations and only return the `id`
     * const quotationWithIdOnly = await prisma.quotation.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends QuotationCreateManyAndReturnArgs>(args?: SelectSubset<T, QuotationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Quotation.
     * @param {QuotationDeleteArgs} args - Arguments to delete one Quotation.
     * @example
     * // Delete one Quotation
     * const Quotation = await prisma.quotation.delete({
     *   where: {
     *     // ... filter to delete one Quotation
     *   }
     * })
     * 
     */
    delete<T extends QuotationDeleteArgs>(args: SelectSubset<T, QuotationDeleteArgs<ExtArgs>>): Prisma__QuotationClient<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Quotation.
     * @param {QuotationUpdateArgs} args - Arguments to update one Quotation.
     * @example
     * // Update one Quotation
     * const quotation = await prisma.quotation.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends QuotationUpdateArgs>(args: SelectSubset<T, QuotationUpdateArgs<ExtArgs>>): Prisma__QuotationClient<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Quotations.
     * @param {QuotationDeleteManyArgs} args - Arguments to filter Quotations to delete.
     * @example
     * // Delete a few Quotations
     * const { count } = await prisma.quotation.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends QuotationDeleteManyArgs>(args?: SelectSubset<T, QuotationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Quotations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuotationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Quotations
     * const quotation = await prisma.quotation.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends QuotationUpdateManyArgs>(args: SelectSubset<T, QuotationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Quotations and returns the data updated in the database.
     * @param {QuotationUpdateManyAndReturnArgs} args - Arguments to update many Quotations.
     * @example
     * // Update many Quotations
     * const quotation = await prisma.quotation.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Quotations and only return the `id`
     * const quotationWithIdOnly = await prisma.quotation.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends QuotationUpdateManyAndReturnArgs>(args: SelectSubset<T, QuotationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Quotation.
     * @param {QuotationUpsertArgs} args - Arguments to update or create a Quotation.
     * @example
     * // Update or create a Quotation
     * const quotation = await prisma.quotation.upsert({
     *   create: {
     *     // ... data to create a Quotation
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Quotation we want to update
     *   }
     * })
     */
    upsert<T extends QuotationUpsertArgs>(args: SelectSubset<T, QuotationUpsertArgs<ExtArgs>>): Prisma__QuotationClient<$Result.GetResult<Prisma.$QuotationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Quotations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuotationCountArgs} args - Arguments to filter Quotations to count.
     * @example
     * // Count the number of Quotations
     * const count = await prisma.quotation.count({
     *   where: {
     *     // ... the filter for the Quotations we want to count
     *   }
     * })
    **/
    count<T extends QuotationCountArgs>(
      args?: Subset<T, QuotationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], QuotationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Quotation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuotationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends QuotationAggregateArgs>(args: Subset<T, QuotationAggregateArgs>): Prisma.PrismaPromise<GetQuotationAggregateType<T>>

    /**
     * Group by Quotation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuotationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends QuotationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: QuotationGroupByArgs['orderBy'] }
        : { orderBy?: QuotationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, QuotationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetQuotationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Quotation model
   */
  readonly fields: QuotationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Quotation.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__QuotationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    company<T extends CompanyDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CompanyDefaultArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    contact<T extends Quotation$contactArgs<ExtArgs> = {}>(args?: Subset<T, Quotation$contactArgs<ExtArgs>>): Prisma__ContactClient<$Result.GetResult<Prisma.$ContactPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    salesperson<T extends Quotation$salespersonArgs<ExtArgs> = {}>(args?: Subset<T, Quotation$salespersonArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Quotation model
   */
  interface QuotationFieldRefs {
    readonly id: FieldRef<"Quotation", 'String'>
    readonly companyId: FieldRef<"Quotation", 'String'>
    readonly status: FieldRef<"Quotation", 'String'>
    readonly salesBeforeVat: FieldRef<"Quotation", 'Float'>
    readonly transportationFee: FieldRef<"Quotation", 'Float'>
    readonly installationFee: FieldRef<"Quotation", 'Float'>
    readonly totalAmountBeforeVat: FieldRef<"Quotation", 'Float'>
    readonly actualClosingAmount: FieldRef<"Quotation", 'Float'>
    readonly createdAt: FieldRef<"Quotation", 'DateTime'>
    readonly updatedAt: FieldRef<"Quotation", 'DateTime'>
    readonly billingDate: FieldRef<"Quotation", 'DateTime'>
    readonly contactId: FieldRef<"Quotation", 'String'>
    readonly followUp1: FieldRef<"Quotation", 'DateTime'>
    readonly followUp2: FieldRef<"Quotation", 'DateTime'>
    readonly followUp3: FieldRef<"Quotation", 'DateTime'>
    readonly followUp4: FieldRef<"Quotation", 'DateTime'>
    readonly invoiceNumber: FieldRef<"Quotation", 'String'>
    readonly poDate: FieldRef<"Quotation", 'DateTime'>
    readonly productType: FieldRef<"Quotation", 'String'>
    readonly quotationDate: FieldRef<"Quotation", 'DateTime'>
    readonly quotationNumber: FieldRef<"Quotation", 'String'>
    readonly rejectReason: FieldRef<"Quotation", 'String'>
    readonly remarks: FieldRef<"Quotation", 'String'>
    readonly requirementDate: FieldRef<"Quotation", 'DateTime'>
    readonly requirementNumber: FieldRef<"Quotation", 'String'>
    readonly salesBranch: FieldRef<"Quotation", 'String'>
    readonly salesTeamLeader: FieldRef<"Quotation", 'String'>
    readonly salespersonId: FieldRef<"Quotation", 'String'>
    readonly subject: FieldRef<"Quotation", 'String'>
    readonly winLossReason: FieldRef<"Quotation", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Quotation findUnique
   */
  export type QuotationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * Filter, which Quotation to fetch.
     */
    where: QuotationWhereUniqueInput
  }

  /**
   * Quotation findUniqueOrThrow
   */
  export type QuotationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * Filter, which Quotation to fetch.
     */
    where: QuotationWhereUniqueInput
  }

  /**
   * Quotation findFirst
   */
  export type QuotationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * Filter, which Quotation to fetch.
     */
    where?: QuotationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Quotations to fetch.
     */
    orderBy?: QuotationOrderByWithRelationInput | QuotationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Quotations.
     */
    cursor?: QuotationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Quotations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Quotations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Quotations.
     */
    distinct?: QuotationScalarFieldEnum | QuotationScalarFieldEnum[]
  }

  /**
   * Quotation findFirstOrThrow
   */
  export type QuotationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * Filter, which Quotation to fetch.
     */
    where?: QuotationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Quotations to fetch.
     */
    orderBy?: QuotationOrderByWithRelationInput | QuotationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Quotations.
     */
    cursor?: QuotationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Quotations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Quotations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Quotations.
     */
    distinct?: QuotationScalarFieldEnum | QuotationScalarFieldEnum[]
  }

  /**
   * Quotation findMany
   */
  export type QuotationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * Filter, which Quotations to fetch.
     */
    where?: QuotationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Quotations to fetch.
     */
    orderBy?: QuotationOrderByWithRelationInput | QuotationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Quotations.
     */
    cursor?: QuotationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Quotations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Quotations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Quotations.
     */
    distinct?: QuotationScalarFieldEnum | QuotationScalarFieldEnum[]
  }

  /**
   * Quotation create
   */
  export type QuotationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * The data needed to create a Quotation.
     */
    data: XOR<QuotationCreateInput, QuotationUncheckedCreateInput>
  }

  /**
   * Quotation createMany
   */
  export type QuotationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Quotations.
     */
    data: QuotationCreateManyInput | QuotationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Quotation createManyAndReturn
   */
  export type QuotationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * The data used to create many Quotations.
     */
    data: QuotationCreateManyInput | QuotationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Quotation update
   */
  export type QuotationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * The data needed to update a Quotation.
     */
    data: XOR<QuotationUpdateInput, QuotationUncheckedUpdateInput>
    /**
     * Choose, which Quotation to update.
     */
    where: QuotationWhereUniqueInput
  }

  /**
   * Quotation updateMany
   */
  export type QuotationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Quotations.
     */
    data: XOR<QuotationUpdateManyMutationInput, QuotationUncheckedUpdateManyInput>
    /**
     * Filter which Quotations to update
     */
    where?: QuotationWhereInput
    /**
     * Limit how many Quotations to update.
     */
    limit?: number
  }

  /**
   * Quotation updateManyAndReturn
   */
  export type QuotationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * The data used to update Quotations.
     */
    data: XOR<QuotationUpdateManyMutationInput, QuotationUncheckedUpdateManyInput>
    /**
     * Filter which Quotations to update
     */
    where?: QuotationWhereInput
    /**
     * Limit how many Quotations to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Quotation upsert
   */
  export type QuotationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * The filter to search for the Quotation to update in case it exists.
     */
    where: QuotationWhereUniqueInput
    /**
     * In case the Quotation found by the `where` argument doesn't exist, create a new Quotation with this data.
     */
    create: XOR<QuotationCreateInput, QuotationUncheckedCreateInput>
    /**
     * In case the Quotation was found with the provided `where` argument, update it with this data.
     */
    update: XOR<QuotationUpdateInput, QuotationUncheckedUpdateInput>
  }

  /**
   * Quotation delete
   */
  export type QuotationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
    /**
     * Filter which Quotation to delete.
     */
    where: QuotationWhereUniqueInput
  }

  /**
   * Quotation deleteMany
   */
  export type QuotationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Quotations to delete
     */
    where?: QuotationWhereInput
    /**
     * Limit how many Quotations to delete.
     */
    limit?: number
  }

  /**
   * Quotation.contact
   */
  export type Quotation$contactArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Contact
     */
    select?: ContactSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Contact
     */
    omit?: ContactOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContactInclude<ExtArgs> | null
    where?: ContactWhereInput
  }

  /**
   * Quotation.salesperson
   */
  export type Quotation$salespersonArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Quotation without action
   */
  export type QuotationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Quotation
     */
    select?: QuotationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Quotation
     */
    omit?: QuotationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuotationInclude<ExtArgs> | null
  }


  /**
   * Model Telesale
   */

  export type AggregateTelesale = {
    _count: TelesaleCountAggregateOutputType | null
    _avg: TelesaleAvgAggregateOutputType | null
    _sum: TelesaleSumAggregateOutputType | null
    _min: TelesaleMinAggregateOutputType | null
    _max: TelesaleMaxAggregateOutputType | null
  }

  export type TelesaleAvgAggregateOutputType = {
    competitorPrice: number | null
  }

  export type TelesaleSumAggregateOutputType = {
    competitorPrice: number | null
  }

  export type TelesaleMinAggregateOutputType = {
    id: string | null
    companyId: string | null
    userId: string | null
    conversationSummary: string | null
    needsOrProblems: string | null
    meetingObjective: string | null
    competitorName: string | null
    competitorPrice: number | null
    competitorPromotion: string | null
    lastMeetingDate: Date | null
    result: string | null
    createdAt: Date | null
    updatedAt: Date | null
    callDate: Date | null
    callOutcome: string | null
    callStatus: string | null
    forwardTo: string | null
    callbackAt: Date | null
  }

  export type TelesaleMaxAggregateOutputType = {
    id: string | null
    companyId: string | null
    userId: string | null
    conversationSummary: string | null
    needsOrProblems: string | null
    meetingObjective: string | null
    competitorName: string | null
    competitorPrice: number | null
    competitorPromotion: string | null
    lastMeetingDate: Date | null
    result: string | null
    createdAt: Date | null
    updatedAt: Date | null
    callDate: Date | null
    callOutcome: string | null
    callStatus: string | null
    forwardTo: string | null
    callbackAt: Date | null
  }

  export type TelesaleCountAggregateOutputType = {
    id: number
    companyId: number
    userId: number
    conversationSummary: number
    needsOrProblems: number
    meetingObjective: number
    competitorName: number
    competitorPrice: number
    competitorPromotion: number
    lastMeetingDate: number
    result: number
    createdAt: number
    updatedAt: number
    callDate: number
    callOutcome: number
    callStatus: number
    forwardTo: number
    callbackAt: number
    _all: number
  }


  export type TelesaleAvgAggregateInputType = {
    competitorPrice?: true
  }

  export type TelesaleSumAggregateInputType = {
    competitorPrice?: true
  }

  export type TelesaleMinAggregateInputType = {
    id?: true
    companyId?: true
    userId?: true
    conversationSummary?: true
    needsOrProblems?: true
    meetingObjective?: true
    competitorName?: true
    competitorPrice?: true
    competitorPromotion?: true
    lastMeetingDate?: true
    result?: true
    createdAt?: true
    updatedAt?: true
    callDate?: true
    callOutcome?: true
    callStatus?: true
    forwardTo?: true
    callbackAt?: true
  }

  export type TelesaleMaxAggregateInputType = {
    id?: true
    companyId?: true
    userId?: true
    conversationSummary?: true
    needsOrProblems?: true
    meetingObjective?: true
    competitorName?: true
    competitorPrice?: true
    competitorPromotion?: true
    lastMeetingDate?: true
    result?: true
    createdAt?: true
    updatedAt?: true
    callDate?: true
    callOutcome?: true
    callStatus?: true
    forwardTo?: true
    callbackAt?: true
  }

  export type TelesaleCountAggregateInputType = {
    id?: true
    companyId?: true
    userId?: true
    conversationSummary?: true
    needsOrProblems?: true
    meetingObjective?: true
    competitorName?: true
    competitorPrice?: true
    competitorPromotion?: true
    lastMeetingDate?: true
    result?: true
    createdAt?: true
    updatedAt?: true
    callDate?: true
    callOutcome?: true
    callStatus?: true
    forwardTo?: true
    callbackAt?: true
    _all?: true
  }

  export type TelesaleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Telesale to aggregate.
     */
    where?: TelesaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Telesales to fetch.
     */
    orderBy?: TelesaleOrderByWithRelationInput | TelesaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TelesaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Telesales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Telesales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Telesales
    **/
    _count?: true | TelesaleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TelesaleAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TelesaleSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TelesaleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TelesaleMaxAggregateInputType
  }

  export type GetTelesaleAggregateType<T extends TelesaleAggregateArgs> = {
        [P in keyof T & keyof AggregateTelesale]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTelesale[P]>
      : GetScalarType<T[P], AggregateTelesale[P]>
  }




  export type TelesaleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TelesaleWhereInput
    orderBy?: TelesaleOrderByWithAggregationInput | TelesaleOrderByWithAggregationInput[]
    by: TelesaleScalarFieldEnum[] | TelesaleScalarFieldEnum
    having?: TelesaleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TelesaleCountAggregateInputType | true
    _avg?: TelesaleAvgAggregateInputType
    _sum?: TelesaleSumAggregateInputType
    _min?: TelesaleMinAggregateInputType
    _max?: TelesaleMaxAggregateInputType
  }

  export type TelesaleGroupByOutputType = {
    id: string
    companyId: string
    userId: string | null
    conversationSummary: string | null
    needsOrProblems: string | null
    meetingObjective: string | null
    competitorName: string | null
    competitorPrice: number | null
    competitorPromotion: string | null
    lastMeetingDate: Date | null
    result: string | null
    createdAt: Date
    updatedAt: Date
    callDate: Date | null
    callOutcome: string | null
    callStatus: string | null
    forwardTo: string | null
    callbackAt: Date | null
    _count: TelesaleCountAggregateOutputType | null
    _avg: TelesaleAvgAggregateOutputType | null
    _sum: TelesaleSumAggregateOutputType | null
    _min: TelesaleMinAggregateOutputType | null
    _max: TelesaleMaxAggregateOutputType | null
  }

  type GetTelesaleGroupByPayload<T extends TelesaleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TelesaleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TelesaleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TelesaleGroupByOutputType[P]>
            : GetScalarType<T[P], TelesaleGroupByOutputType[P]>
        }
      >
    >


  export type TelesaleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    userId?: boolean
    conversationSummary?: boolean
    needsOrProblems?: boolean
    meetingObjective?: boolean
    competitorName?: boolean
    competitorPrice?: boolean
    competitorPromotion?: boolean
    lastMeetingDate?: boolean
    result?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    callDate?: boolean
    callOutcome?: boolean
    callStatus?: boolean
    forwardTo?: boolean
    callbackAt?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    user?: boolean | Telesale$userArgs<ExtArgs>
  }, ExtArgs["result"]["telesale"]>

  export type TelesaleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    userId?: boolean
    conversationSummary?: boolean
    needsOrProblems?: boolean
    meetingObjective?: boolean
    competitorName?: boolean
    competitorPrice?: boolean
    competitorPromotion?: boolean
    lastMeetingDate?: boolean
    result?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    callDate?: boolean
    callOutcome?: boolean
    callStatus?: boolean
    forwardTo?: boolean
    callbackAt?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    user?: boolean | Telesale$userArgs<ExtArgs>
  }, ExtArgs["result"]["telesale"]>

  export type TelesaleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    companyId?: boolean
    userId?: boolean
    conversationSummary?: boolean
    needsOrProblems?: boolean
    meetingObjective?: boolean
    competitorName?: boolean
    competitorPrice?: boolean
    competitorPromotion?: boolean
    lastMeetingDate?: boolean
    result?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    callDate?: boolean
    callOutcome?: boolean
    callStatus?: boolean
    forwardTo?: boolean
    callbackAt?: boolean
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    user?: boolean | Telesale$userArgs<ExtArgs>
  }, ExtArgs["result"]["telesale"]>

  export type TelesaleSelectScalar = {
    id?: boolean
    companyId?: boolean
    userId?: boolean
    conversationSummary?: boolean
    needsOrProblems?: boolean
    meetingObjective?: boolean
    competitorName?: boolean
    competitorPrice?: boolean
    competitorPromotion?: boolean
    lastMeetingDate?: boolean
    result?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    callDate?: boolean
    callOutcome?: boolean
    callStatus?: boolean
    forwardTo?: boolean
    callbackAt?: boolean
  }

  export type TelesaleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "companyId" | "userId" | "conversationSummary" | "needsOrProblems" | "meetingObjective" | "competitorName" | "competitorPrice" | "competitorPromotion" | "lastMeetingDate" | "result" | "createdAt" | "updatedAt" | "callDate" | "callOutcome" | "callStatus" | "forwardTo" | "callbackAt", ExtArgs["result"]["telesale"]>
  export type TelesaleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    user?: boolean | Telesale$userArgs<ExtArgs>
  }
  export type TelesaleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    user?: boolean | Telesale$userArgs<ExtArgs>
  }
  export type TelesaleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    company?: boolean | CompanyDefaultArgs<ExtArgs>
    user?: boolean | Telesale$userArgs<ExtArgs>
  }

  export type $TelesalePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Telesale"
    objects: {
      company: Prisma.$CompanyPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      companyId: string
      userId: string | null
      conversationSummary: string | null
      needsOrProblems: string | null
      meetingObjective: string | null
      competitorName: string | null
      competitorPrice: number | null
      competitorPromotion: string | null
      lastMeetingDate: Date | null
      result: string | null
      createdAt: Date
      updatedAt: Date
      callDate: Date | null
      callOutcome: string | null
      callStatus: string | null
      forwardTo: string | null
      callbackAt: Date | null
    }, ExtArgs["result"]["telesale"]>
    composites: {}
  }

  type TelesaleGetPayload<S extends boolean | null | undefined | TelesaleDefaultArgs> = $Result.GetResult<Prisma.$TelesalePayload, S>

  type TelesaleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TelesaleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TelesaleCountAggregateInputType | true
    }

  export interface TelesaleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Telesale'], meta: { name: 'Telesale' } }
    /**
     * Find zero or one Telesale that matches the filter.
     * @param {TelesaleFindUniqueArgs} args - Arguments to find a Telesale
     * @example
     * // Get one Telesale
     * const telesale = await prisma.telesale.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TelesaleFindUniqueArgs>(args: SelectSubset<T, TelesaleFindUniqueArgs<ExtArgs>>): Prisma__TelesaleClient<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Telesale that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TelesaleFindUniqueOrThrowArgs} args - Arguments to find a Telesale
     * @example
     * // Get one Telesale
     * const telesale = await prisma.telesale.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TelesaleFindUniqueOrThrowArgs>(args: SelectSubset<T, TelesaleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TelesaleClient<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Telesale that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TelesaleFindFirstArgs} args - Arguments to find a Telesale
     * @example
     * // Get one Telesale
     * const telesale = await prisma.telesale.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TelesaleFindFirstArgs>(args?: SelectSubset<T, TelesaleFindFirstArgs<ExtArgs>>): Prisma__TelesaleClient<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Telesale that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TelesaleFindFirstOrThrowArgs} args - Arguments to find a Telesale
     * @example
     * // Get one Telesale
     * const telesale = await prisma.telesale.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TelesaleFindFirstOrThrowArgs>(args?: SelectSubset<T, TelesaleFindFirstOrThrowArgs<ExtArgs>>): Prisma__TelesaleClient<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Telesales that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TelesaleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Telesales
     * const telesales = await prisma.telesale.findMany()
     * 
     * // Get first 10 Telesales
     * const telesales = await prisma.telesale.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const telesaleWithIdOnly = await prisma.telesale.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TelesaleFindManyArgs>(args?: SelectSubset<T, TelesaleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Telesale.
     * @param {TelesaleCreateArgs} args - Arguments to create a Telesale.
     * @example
     * // Create one Telesale
     * const Telesale = await prisma.telesale.create({
     *   data: {
     *     // ... data to create a Telesale
     *   }
     * })
     * 
     */
    create<T extends TelesaleCreateArgs>(args: SelectSubset<T, TelesaleCreateArgs<ExtArgs>>): Prisma__TelesaleClient<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Telesales.
     * @param {TelesaleCreateManyArgs} args - Arguments to create many Telesales.
     * @example
     * // Create many Telesales
     * const telesale = await prisma.telesale.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TelesaleCreateManyArgs>(args?: SelectSubset<T, TelesaleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Telesales and returns the data saved in the database.
     * @param {TelesaleCreateManyAndReturnArgs} args - Arguments to create many Telesales.
     * @example
     * // Create many Telesales
     * const telesale = await prisma.telesale.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Telesales and only return the `id`
     * const telesaleWithIdOnly = await prisma.telesale.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TelesaleCreateManyAndReturnArgs>(args?: SelectSubset<T, TelesaleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Telesale.
     * @param {TelesaleDeleteArgs} args - Arguments to delete one Telesale.
     * @example
     * // Delete one Telesale
     * const Telesale = await prisma.telesale.delete({
     *   where: {
     *     // ... filter to delete one Telesale
     *   }
     * })
     * 
     */
    delete<T extends TelesaleDeleteArgs>(args: SelectSubset<T, TelesaleDeleteArgs<ExtArgs>>): Prisma__TelesaleClient<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Telesale.
     * @param {TelesaleUpdateArgs} args - Arguments to update one Telesale.
     * @example
     * // Update one Telesale
     * const telesale = await prisma.telesale.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TelesaleUpdateArgs>(args: SelectSubset<T, TelesaleUpdateArgs<ExtArgs>>): Prisma__TelesaleClient<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Telesales.
     * @param {TelesaleDeleteManyArgs} args - Arguments to filter Telesales to delete.
     * @example
     * // Delete a few Telesales
     * const { count } = await prisma.telesale.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TelesaleDeleteManyArgs>(args?: SelectSubset<T, TelesaleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Telesales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TelesaleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Telesales
     * const telesale = await prisma.telesale.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TelesaleUpdateManyArgs>(args: SelectSubset<T, TelesaleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Telesales and returns the data updated in the database.
     * @param {TelesaleUpdateManyAndReturnArgs} args - Arguments to update many Telesales.
     * @example
     * // Update many Telesales
     * const telesale = await prisma.telesale.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Telesales and only return the `id`
     * const telesaleWithIdOnly = await prisma.telesale.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TelesaleUpdateManyAndReturnArgs>(args: SelectSubset<T, TelesaleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Telesale.
     * @param {TelesaleUpsertArgs} args - Arguments to update or create a Telesale.
     * @example
     * // Update or create a Telesale
     * const telesale = await prisma.telesale.upsert({
     *   create: {
     *     // ... data to create a Telesale
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Telesale we want to update
     *   }
     * })
     */
    upsert<T extends TelesaleUpsertArgs>(args: SelectSubset<T, TelesaleUpsertArgs<ExtArgs>>): Prisma__TelesaleClient<$Result.GetResult<Prisma.$TelesalePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Telesales.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TelesaleCountArgs} args - Arguments to filter Telesales to count.
     * @example
     * // Count the number of Telesales
     * const count = await prisma.telesale.count({
     *   where: {
     *     // ... the filter for the Telesales we want to count
     *   }
     * })
    **/
    count<T extends TelesaleCountArgs>(
      args?: Subset<T, TelesaleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TelesaleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Telesale.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TelesaleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TelesaleAggregateArgs>(args: Subset<T, TelesaleAggregateArgs>): Prisma.PrismaPromise<GetTelesaleAggregateType<T>>

    /**
     * Group by Telesale.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TelesaleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TelesaleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TelesaleGroupByArgs['orderBy'] }
        : { orderBy?: TelesaleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TelesaleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTelesaleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Telesale model
   */
  readonly fields: TelesaleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Telesale.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TelesaleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    company<T extends CompanyDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CompanyDefaultArgs<ExtArgs>>): Prisma__CompanyClient<$Result.GetResult<Prisma.$CompanyPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    user<T extends Telesale$userArgs<ExtArgs> = {}>(args?: Subset<T, Telesale$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Telesale model
   */
  interface TelesaleFieldRefs {
    readonly id: FieldRef<"Telesale", 'String'>
    readonly companyId: FieldRef<"Telesale", 'String'>
    readonly userId: FieldRef<"Telesale", 'String'>
    readonly conversationSummary: FieldRef<"Telesale", 'String'>
    readonly needsOrProblems: FieldRef<"Telesale", 'String'>
    readonly meetingObjective: FieldRef<"Telesale", 'String'>
    readonly competitorName: FieldRef<"Telesale", 'String'>
    readonly competitorPrice: FieldRef<"Telesale", 'Float'>
    readonly competitorPromotion: FieldRef<"Telesale", 'String'>
    readonly lastMeetingDate: FieldRef<"Telesale", 'DateTime'>
    readonly result: FieldRef<"Telesale", 'String'>
    readonly createdAt: FieldRef<"Telesale", 'DateTime'>
    readonly updatedAt: FieldRef<"Telesale", 'DateTime'>
    readonly callDate: FieldRef<"Telesale", 'DateTime'>
    readonly callOutcome: FieldRef<"Telesale", 'String'>
    readonly callStatus: FieldRef<"Telesale", 'String'>
    readonly forwardTo: FieldRef<"Telesale", 'String'>
    readonly callbackAt: FieldRef<"Telesale", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Telesale findUnique
   */
  export type TelesaleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * Filter, which Telesale to fetch.
     */
    where: TelesaleWhereUniqueInput
  }

  /**
   * Telesale findUniqueOrThrow
   */
  export type TelesaleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * Filter, which Telesale to fetch.
     */
    where: TelesaleWhereUniqueInput
  }

  /**
   * Telesale findFirst
   */
  export type TelesaleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * Filter, which Telesale to fetch.
     */
    where?: TelesaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Telesales to fetch.
     */
    orderBy?: TelesaleOrderByWithRelationInput | TelesaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Telesales.
     */
    cursor?: TelesaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Telesales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Telesales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Telesales.
     */
    distinct?: TelesaleScalarFieldEnum | TelesaleScalarFieldEnum[]
  }

  /**
   * Telesale findFirstOrThrow
   */
  export type TelesaleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * Filter, which Telesale to fetch.
     */
    where?: TelesaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Telesales to fetch.
     */
    orderBy?: TelesaleOrderByWithRelationInput | TelesaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Telesales.
     */
    cursor?: TelesaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Telesales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Telesales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Telesales.
     */
    distinct?: TelesaleScalarFieldEnum | TelesaleScalarFieldEnum[]
  }

  /**
   * Telesale findMany
   */
  export type TelesaleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * Filter, which Telesales to fetch.
     */
    where?: TelesaleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Telesales to fetch.
     */
    orderBy?: TelesaleOrderByWithRelationInput | TelesaleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Telesales.
     */
    cursor?: TelesaleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Telesales from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Telesales.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Telesales.
     */
    distinct?: TelesaleScalarFieldEnum | TelesaleScalarFieldEnum[]
  }

  /**
   * Telesale create
   */
  export type TelesaleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * The data needed to create a Telesale.
     */
    data: XOR<TelesaleCreateInput, TelesaleUncheckedCreateInput>
  }

  /**
   * Telesale createMany
   */
  export type TelesaleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Telesales.
     */
    data: TelesaleCreateManyInput | TelesaleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Telesale createManyAndReturn
   */
  export type TelesaleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * The data used to create many Telesales.
     */
    data: TelesaleCreateManyInput | TelesaleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Telesale update
   */
  export type TelesaleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * The data needed to update a Telesale.
     */
    data: XOR<TelesaleUpdateInput, TelesaleUncheckedUpdateInput>
    /**
     * Choose, which Telesale to update.
     */
    where: TelesaleWhereUniqueInput
  }

  /**
   * Telesale updateMany
   */
  export type TelesaleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Telesales.
     */
    data: XOR<TelesaleUpdateManyMutationInput, TelesaleUncheckedUpdateManyInput>
    /**
     * Filter which Telesales to update
     */
    where?: TelesaleWhereInput
    /**
     * Limit how many Telesales to update.
     */
    limit?: number
  }

  /**
   * Telesale updateManyAndReturn
   */
  export type TelesaleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * The data used to update Telesales.
     */
    data: XOR<TelesaleUpdateManyMutationInput, TelesaleUncheckedUpdateManyInput>
    /**
     * Filter which Telesales to update
     */
    where?: TelesaleWhereInput
    /**
     * Limit how many Telesales to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Telesale upsert
   */
  export type TelesaleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * The filter to search for the Telesale to update in case it exists.
     */
    where: TelesaleWhereUniqueInput
    /**
     * In case the Telesale found by the `where` argument doesn't exist, create a new Telesale with this data.
     */
    create: XOR<TelesaleCreateInput, TelesaleUncheckedCreateInput>
    /**
     * In case the Telesale was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TelesaleUpdateInput, TelesaleUncheckedUpdateInput>
  }

  /**
   * Telesale delete
   */
  export type TelesaleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
    /**
     * Filter which Telesale to delete.
     */
    where: TelesaleWhereUniqueInput
  }

  /**
   * Telesale deleteMany
   */
  export type TelesaleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Telesales to delete
     */
    where?: TelesaleWhereInput
    /**
     * Limit how many Telesales to delete.
     */
    limit?: number
  }

  /**
   * Telesale.user
   */
  export type Telesale$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Telesale without action
   */
  export type TelesaleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Telesale
     */
    select?: TelesaleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Telesale
     */
    omit?: TelesaleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TelesaleInclude<ExtArgs> | null
  }


  /**
   * Model BusinessType
   */

  export type AggregateBusinessType = {
    _count: BusinessTypeCountAggregateOutputType | null
    _min: BusinessTypeMinAggregateOutputType | null
    _max: BusinessTypeMaxAggregateOutputType | null
  }

  export type BusinessTypeMinAggregateOutputType = {
    id: string | null
    name: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BusinessTypeMaxAggregateOutputType = {
    id: string | null
    name: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type BusinessTypeCountAggregateOutputType = {
    id: number
    name: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type BusinessTypeMinAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BusinessTypeMaxAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    updatedAt?: true
  }

  export type BusinessTypeCountAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type BusinessTypeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BusinessType to aggregate.
     */
    where?: BusinessTypeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BusinessTypes to fetch.
     */
    orderBy?: BusinessTypeOrderByWithRelationInput | BusinessTypeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BusinessTypeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BusinessTypes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BusinessTypes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BusinessTypes
    **/
    _count?: true | BusinessTypeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BusinessTypeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BusinessTypeMaxAggregateInputType
  }

  export type GetBusinessTypeAggregateType<T extends BusinessTypeAggregateArgs> = {
        [P in keyof T & keyof AggregateBusinessType]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBusinessType[P]>
      : GetScalarType<T[P], AggregateBusinessType[P]>
  }




  export type BusinessTypeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BusinessTypeWhereInput
    orderBy?: BusinessTypeOrderByWithAggregationInput | BusinessTypeOrderByWithAggregationInput[]
    by: BusinessTypeScalarFieldEnum[] | BusinessTypeScalarFieldEnum
    having?: BusinessTypeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BusinessTypeCountAggregateInputType | true
    _min?: BusinessTypeMinAggregateInputType
    _max?: BusinessTypeMaxAggregateInputType
  }

  export type BusinessTypeGroupByOutputType = {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
    _count: BusinessTypeCountAggregateOutputType | null
    _min: BusinessTypeMinAggregateOutputType | null
    _max: BusinessTypeMaxAggregateOutputType | null
  }

  type GetBusinessTypeGroupByPayload<T extends BusinessTypeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BusinessTypeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BusinessTypeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BusinessTypeGroupByOutputType[P]>
            : GetScalarType<T[P], BusinessTypeGroupByOutputType[P]>
        }
      >
    >


  export type BusinessTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["businessType"]>

  export type BusinessTypeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["businessType"]>

  export type BusinessTypeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["businessType"]>

  export type BusinessTypeSelectScalar = {
    id?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type BusinessTypeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "createdAt" | "updatedAt", ExtArgs["result"]["businessType"]>

  export type $BusinessTypePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BusinessType"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["businessType"]>
    composites: {}
  }

  type BusinessTypeGetPayload<S extends boolean | null | undefined | BusinessTypeDefaultArgs> = $Result.GetResult<Prisma.$BusinessTypePayload, S>

  type BusinessTypeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BusinessTypeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BusinessTypeCountAggregateInputType | true
    }

  export interface BusinessTypeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BusinessType'], meta: { name: 'BusinessType' } }
    /**
     * Find zero or one BusinessType that matches the filter.
     * @param {BusinessTypeFindUniqueArgs} args - Arguments to find a BusinessType
     * @example
     * // Get one BusinessType
     * const businessType = await prisma.businessType.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BusinessTypeFindUniqueArgs>(args: SelectSubset<T, BusinessTypeFindUniqueArgs<ExtArgs>>): Prisma__BusinessTypeClient<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one BusinessType that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BusinessTypeFindUniqueOrThrowArgs} args - Arguments to find a BusinessType
     * @example
     * // Get one BusinessType
     * const businessType = await prisma.businessType.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BusinessTypeFindUniqueOrThrowArgs>(args: SelectSubset<T, BusinessTypeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BusinessTypeClient<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BusinessType that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusinessTypeFindFirstArgs} args - Arguments to find a BusinessType
     * @example
     * // Get one BusinessType
     * const businessType = await prisma.businessType.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BusinessTypeFindFirstArgs>(args?: SelectSubset<T, BusinessTypeFindFirstArgs<ExtArgs>>): Prisma__BusinessTypeClient<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first BusinessType that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusinessTypeFindFirstOrThrowArgs} args - Arguments to find a BusinessType
     * @example
     * // Get one BusinessType
     * const businessType = await prisma.businessType.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BusinessTypeFindFirstOrThrowArgs>(args?: SelectSubset<T, BusinessTypeFindFirstOrThrowArgs<ExtArgs>>): Prisma__BusinessTypeClient<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more BusinessTypes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusinessTypeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BusinessTypes
     * const businessTypes = await prisma.businessType.findMany()
     * 
     * // Get first 10 BusinessTypes
     * const businessTypes = await prisma.businessType.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const businessTypeWithIdOnly = await prisma.businessType.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BusinessTypeFindManyArgs>(args?: SelectSubset<T, BusinessTypeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a BusinessType.
     * @param {BusinessTypeCreateArgs} args - Arguments to create a BusinessType.
     * @example
     * // Create one BusinessType
     * const BusinessType = await prisma.businessType.create({
     *   data: {
     *     // ... data to create a BusinessType
     *   }
     * })
     * 
     */
    create<T extends BusinessTypeCreateArgs>(args: SelectSubset<T, BusinessTypeCreateArgs<ExtArgs>>): Prisma__BusinessTypeClient<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many BusinessTypes.
     * @param {BusinessTypeCreateManyArgs} args - Arguments to create many BusinessTypes.
     * @example
     * // Create many BusinessTypes
     * const businessType = await prisma.businessType.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BusinessTypeCreateManyArgs>(args?: SelectSubset<T, BusinessTypeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BusinessTypes and returns the data saved in the database.
     * @param {BusinessTypeCreateManyAndReturnArgs} args - Arguments to create many BusinessTypes.
     * @example
     * // Create many BusinessTypes
     * const businessType = await prisma.businessType.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BusinessTypes and only return the `id`
     * const businessTypeWithIdOnly = await prisma.businessType.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BusinessTypeCreateManyAndReturnArgs>(args?: SelectSubset<T, BusinessTypeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a BusinessType.
     * @param {BusinessTypeDeleteArgs} args - Arguments to delete one BusinessType.
     * @example
     * // Delete one BusinessType
     * const BusinessType = await prisma.businessType.delete({
     *   where: {
     *     // ... filter to delete one BusinessType
     *   }
     * })
     * 
     */
    delete<T extends BusinessTypeDeleteArgs>(args: SelectSubset<T, BusinessTypeDeleteArgs<ExtArgs>>): Prisma__BusinessTypeClient<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one BusinessType.
     * @param {BusinessTypeUpdateArgs} args - Arguments to update one BusinessType.
     * @example
     * // Update one BusinessType
     * const businessType = await prisma.businessType.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BusinessTypeUpdateArgs>(args: SelectSubset<T, BusinessTypeUpdateArgs<ExtArgs>>): Prisma__BusinessTypeClient<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more BusinessTypes.
     * @param {BusinessTypeDeleteManyArgs} args - Arguments to filter BusinessTypes to delete.
     * @example
     * // Delete a few BusinessTypes
     * const { count } = await prisma.businessType.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BusinessTypeDeleteManyArgs>(args?: SelectSubset<T, BusinessTypeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BusinessTypes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusinessTypeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BusinessTypes
     * const businessType = await prisma.businessType.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BusinessTypeUpdateManyArgs>(args: SelectSubset<T, BusinessTypeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BusinessTypes and returns the data updated in the database.
     * @param {BusinessTypeUpdateManyAndReturnArgs} args - Arguments to update many BusinessTypes.
     * @example
     * // Update many BusinessTypes
     * const businessType = await prisma.businessType.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BusinessTypes and only return the `id`
     * const businessTypeWithIdOnly = await prisma.businessType.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BusinessTypeUpdateManyAndReturnArgs>(args: SelectSubset<T, BusinessTypeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one BusinessType.
     * @param {BusinessTypeUpsertArgs} args - Arguments to update or create a BusinessType.
     * @example
     * // Update or create a BusinessType
     * const businessType = await prisma.businessType.upsert({
     *   create: {
     *     // ... data to create a BusinessType
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BusinessType we want to update
     *   }
     * })
     */
    upsert<T extends BusinessTypeUpsertArgs>(args: SelectSubset<T, BusinessTypeUpsertArgs<ExtArgs>>): Prisma__BusinessTypeClient<$Result.GetResult<Prisma.$BusinessTypePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of BusinessTypes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusinessTypeCountArgs} args - Arguments to filter BusinessTypes to count.
     * @example
     * // Count the number of BusinessTypes
     * const count = await prisma.businessType.count({
     *   where: {
     *     // ... the filter for the BusinessTypes we want to count
     *   }
     * })
    **/
    count<T extends BusinessTypeCountArgs>(
      args?: Subset<T, BusinessTypeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BusinessTypeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BusinessType.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusinessTypeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BusinessTypeAggregateArgs>(args: Subset<T, BusinessTypeAggregateArgs>): Prisma.PrismaPromise<GetBusinessTypeAggregateType<T>>

    /**
     * Group by BusinessType.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BusinessTypeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BusinessTypeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BusinessTypeGroupByArgs['orderBy'] }
        : { orderBy?: BusinessTypeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BusinessTypeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBusinessTypeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BusinessType model
   */
  readonly fields: BusinessTypeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BusinessType.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BusinessTypeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BusinessType model
   */
  interface BusinessTypeFieldRefs {
    readonly id: FieldRef<"BusinessType", 'String'>
    readonly name: FieldRef<"BusinessType", 'String'>
    readonly createdAt: FieldRef<"BusinessType", 'DateTime'>
    readonly updatedAt: FieldRef<"BusinessType", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BusinessType findUnique
   */
  export type BusinessTypeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * Filter, which BusinessType to fetch.
     */
    where: BusinessTypeWhereUniqueInput
  }

  /**
   * BusinessType findUniqueOrThrow
   */
  export type BusinessTypeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * Filter, which BusinessType to fetch.
     */
    where: BusinessTypeWhereUniqueInput
  }

  /**
   * BusinessType findFirst
   */
  export type BusinessTypeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * Filter, which BusinessType to fetch.
     */
    where?: BusinessTypeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BusinessTypes to fetch.
     */
    orderBy?: BusinessTypeOrderByWithRelationInput | BusinessTypeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BusinessTypes.
     */
    cursor?: BusinessTypeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BusinessTypes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BusinessTypes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BusinessTypes.
     */
    distinct?: BusinessTypeScalarFieldEnum | BusinessTypeScalarFieldEnum[]
  }

  /**
   * BusinessType findFirstOrThrow
   */
  export type BusinessTypeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * Filter, which BusinessType to fetch.
     */
    where?: BusinessTypeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BusinessTypes to fetch.
     */
    orderBy?: BusinessTypeOrderByWithRelationInput | BusinessTypeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BusinessTypes.
     */
    cursor?: BusinessTypeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BusinessTypes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BusinessTypes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BusinessTypes.
     */
    distinct?: BusinessTypeScalarFieldEnum | BusinessTypeScalarFieldEnum[]
  }

  /**
   * BusinessType findMany
   */
  export type BusinessTypeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * Filter, which BusinessTypes to fetch.
     */
    where?: BusinessTypeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BusinessTypes to fetch.
     */
    orderBy?: BusinessTypeOrderByWithRelationInput | BusinessTypeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BusinessTypes.
     */
    cursor?: BusinessTypeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BusinessTypes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BusinessTypes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BusinessTypes.
     */
    distinct?: BusinessTypeScalarFieldEnum | BusinessTypeScalarFieldEnum[]
  }

  /**
   * BusinessType create
   */
  export type BusinessTypeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * The data needed to create a BusinessType.
     */
    data: XOR<BusinessTypeCreateInput, BusinessTypeUncheckedCreateInput>
  }

  /**
   * BusinessType createMany
   */
  export type BusinessTypeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BusinessTypes.
     */
    data: BusinessTypeCreateManyInput | BusinessTypeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BusinessType createManyAndReturn
   */
  export type BusinessTypeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * The data used to create many BusinessTypes.
     */
    data: BusinessTypeCreateManyInput | BusinessTypeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BusinessType update
   */
  export type BusinessTypeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * The data needed to update a BusinessType.
     */
    data: XOR<BusinessTypeUpdateInput, BusinessTypeUncheckedUpdateInput>
    /**
     * Choose, which BusinessType to update.
     */
    where: BusinessTypeWhereUniqueInput
  }

  /**
   * BusinessType updateMany
   */
  export type BusinessTypeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BusinessTypes.
     */
    data: XOR<BusinessTypeUpdateManyMutationInput, BusinessTypeUncheckedUpdateManyInput>
    /**
     * Filter which BusinessTypes to update
     */
    where?: BusinessTypeWhereInput
    /**
     * Limit how many BusinessTypes to update.
     */
    limit?: number
  }

  /**
   * BusinessType updateManyAndReturn
   */
  export type BusinessTypeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * The data used to update BusinessTypes.
     */
    data: XOR<BusinessTypeUpdateManyMutationInput, BusinessTypeUncheckedUpdateManyInput>
    /**
     * Filter which BusinessTypes to update
     */
    where?: BusinessTypeWhereInput
    /**
     * Limit how many BusinessTypes to update.
     */
    limit?: number
  }

  /**
   * BusinessType upsert
   */
  export type BusinessTypeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * The filter to search for the BusinessType to update in case it exists.
     */
    where: BusinessTypeWhereUniqueInput
    /**
     * In case the BusinessType found by the `where` argument doesn't exist, create a new BusinessType with this data.
     */
    create: XOR<BusinessTypeCreateInput, BusinessTypeUncheckedCreateInput>
    /**
     * In case the BusinessType was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BusinessTypeUpdateInput, BusinessTypeUncheckedUpdateInput>
  }

  /**
   * BusinessType delete
   */
  export type BusinessTypeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
    /**
     * Filter which BusinessType to delete.
     */
    where: BusinessTypeWhereUniqueInput
  }

  /**
   * BusinessType deleteMany
   */
  export type BusinessTypeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BusinessTypes to delete
     */
    where?: BusinessTypeWhereInput
    /**
     * Limit how many BusinessTypes to delete.
     */
    limit?: number
  }

  /**
   * BusinessType without action
   */
  export type BusinessTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BusinessType
     */
    select?: BusinessTypeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BusinessType
     */
    omit?: BusinessTypeOmit<ExtArgs> | null
  }


  /**
   * Model PostalData
   */

  export type AggregatePostalData = {
    _count: PostalDataCountAggregateOutputType | null
    _min: PostalDataMinAggregateOutputType | null
    _max: PostalDataMaxAggregateOutputType | null
  }

  export type PostalDataMinAggregateOutputType = {
    id: string | null
    postalCode: string | null
    subDistrict: string | null
    district: string | null
    province: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PostalDataMaxAggregateOutputType = {
    id: string | null
    postalCode: string | null
    subDistrict: string | null
    district: string | null
    province: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type PostalDataCountAggregateOutputType = {
    id: number
    postalCode: number
    subDistrict: number
    district: number
    province: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type PostalDataMinAggregateInputType = {
    id?: true
    postalCode?: true
    subDistrict?: true
    district?: true
    province?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PostalDataMaxAggregateInputType = {
    id?: true
    postalCode?: true
    subDistrict?: true
    district?: true
    province?: true
    createdAt?: true
    updatedAt?: true
  }

  export type PostalDataCountAggregateInputType = {
    id?: true
    postalCode?: true
    subDistrict?: true
    district?: true
    province?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type PostalDataAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PostalData to aggregate.
     */
    where?: PostalDataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PostalData to fetch.
     */
    orderBy?: PostalDataOrderByWithRelationInput | PostalDataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PostalDataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PostalData from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PostalData.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PostalData
    **/
    _count?: true | PostalDataCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PostalDataMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PostalDataMaxAggregateInputType
  }

  export type GetPostalDataAggregateType<T extends PostalDataAggregateArgs> = {
        [P in keyof T & keyof AggregatePostalData]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePostalData[P]>
      : GetScalarType<T[P], AggregatePostalData[P]>
  }




  export type PostalDataGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PostalDataWhereInput
    orderBy?: PostalDataOrderByWithAggregationInput | PostalDataOrderByWithAggregationInput[]
    by: PostalDataScalarFieldEnum[] | PostalDataScalarFieldEnum
    having?: PostalDataScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PostalDataCountAggregateInputType | true
    _min?: PostalDataMinAggregateInputType
    _max?: PostalDataMaxAggregateInputType
  }

  export type PostalDataGroupByOutputType = {
    id: string
    postalCode: string
    subDistrict: string
    district: string
    province: string
    createdAt: Date
    updatedAt: Date
    _count: PostalDataCountAggregateOutputType | null
    _min: PostalDataMinAggregateOutputType | null
    _max: PostalDataMaxAggregateOutputType | null
  }

  type GetPostalDataGroupByPayload<T extends PostalDataGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PostalDataGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PostalDataGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PostalDataGroupByOutputType[P]>
            : GetScalarType<T[P], PostalDataGroupByOutputType[P]>
        }
      >
    >


  export type PostalDataSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    postalCode?: boolean
    subDistrict?: boolean
    district?: boolean
    province?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["postalData"]>

  export type PostalDataSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    postalCode?: boolean
    subDistrict?: boolean
    district?: boolean
    province?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["postalData"]>

  export type PostalDataSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    postalCode?: boolean
    subDistrict?: boolean
    district?: boolean
    province?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["postalData"]>

  export type PostalDataSelectScalar = {
    id?: boolean
    postalCode?: boolean
    subDistrict?: boolean
    district?: boolean
    province?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type PostalDataOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "postalCode" | "subDistrict" | "district" | "province" | "createdAt" | "updatedAt", ExtArgs["result"]["postalData"]>

  export type $PostalDataPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PostalData"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      postalCode: string
      subDistrict: string
      district: string
      province: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["postalData"]>
    composites: {}
  }

  type PostalDataGetPayload<S extends boolean | null | undefined | PostalDataDefaultArgs> = $Result.GetResult<Prisma.$PostalDataPayload, S>

  type PostalDataCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PostalDataFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PostalDataCountAggregateInputType | true
    }

  export interface PostalDataDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PostalData'], meta: { name: 'PostalData' } }
    /**
     * Find zero or one PostalData that matches the filter.
     * @param {PostalDataFindUniqueArgs} args - Arguments to find a PostalData
     * @example
     * // Get one PostalData
     * const postalData = await prisma.postalData.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PostalDataFindUniqueArgs>(args: SelectSubset<T, PostalDataFindUniqueArgs<ExtArgs>>): Prisma__PostalDataClient<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PostalData that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PostalDataFindUniqueOrThrowArgs} args - Arguments to find a PostalData
     * @example
     * // Get one PostalData
     * const postalData = await prisma.postalData.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PostalDataFindUniqueOrThrowArgs>(args: SelectSubset<T, PostalDataFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PostalDataClient<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PostalData that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostalDataFindFirstArgs} args - Arguments to find a PostalData
     * @example
     * // Get one PostalData
     * const postalData = await prisma.postalData.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PostalDataFindFirstArgs>(args?: SelectSubset<T, PostalDataFindFirstArgs<ExtArgs>>): Prisma__PostalDataClient<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PostalData that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostalDataFindFirstOrThrowArgs} args - Arguments to find a PostalData
     * @example
     * // Get one PostalData
     * const postalData = await prisma.postalData.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PostalDataFindFirstOrThrowArgs>(args?: SelectSubset<T, PostalDataFindFirstOrThrowArgs<ExtArgs>>): Prisma__PostalDataClient<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PostalData that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostalDataFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PostalData
     * const postalData = await prisma.postalData.findMany()
     * 
     * // Get first 10 PostalData
     * const postalData = await prisma.postalData.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const postalDataWithIdOnly = await prisma.postalData.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PostalDataFindManyArgs>(args?: SelectSubset<T, PostalDataFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PostalData.
     * @param {PostalDataCreateArgs} args - Arguments to create a PostalData.
     * @example
     * // Create one PostalData
     * const PostalData = await prisma.postalData.create({
     *   data: {
     *     // ... data to create a PostalData
     *   }
     * })
     * 
     */
    create<T extends PostalDataCreateArgs>(args: SelectSubset<T, PostalDataCreateArgs<ExtArgs>>): Prisma__PostalDataClient<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PostalData.
     * @param {PostalDataCreateManyArgs} args - Arguments to create many PostalData.
     * @example
     * // Create many PostalData
     * const postalData = await prisma.postalData.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PostalDataCreateManyArgs>(args?: SelectSubset<T, PostalDataCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PostalData and returns the data saved in the database.
     * @param {PostalDataCreateManyAndReturnArgs} args - Arguments to create many PostalData.
     * @example
     * // Create many PostalData
     * const postalData = await prisma.postalData.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PostalData and only return the `id`
     * const postalDataWithIdOnly = await prisma.postalData.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PostalDataCreateManyAndReturnArgs>(args?: SelectSubset<T, PostalDataCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a PostalData.
     * @param {PostalDataDeleteArgs} args - Arguments to delete one PostalData.
     * @example
     * // Delete one PostalData
     * const PostalData = await prisma.postalData.delete({
     *   where: {
     *     // ... filter to delete one PostalData
     *   }
     * })
     * 
     */
    delete<T extends PostalDataDeleteArgs>(args: SelectSubset<T, PostalDataDeleteArgs<ExtArgs>>): Prisma__PostalDataClient<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PostalData.
     * @param {PostalDataUpdateArgs} args - Arguments to update one PostalData.
     * @example
     * // Update one PostalData
     * const postalData = await prisma.postalData.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PostalDataUpdateArgs>(args: SelectSubset<T, PostalDataUpdateArgs<ExtArgs>>): Prisma__PostalDataClient<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PostalData.
     * @param {PostalDataDeleteManyArgs} args - Arguments to filter PostalData to delete.
     * @example
     * // Delete a few PostalData
     * const { count } = await prisma.postalData.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PostalDataDeleteManyArgs>(args?: SelectSubset<T, PostalDataDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PostalData.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostalDataUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PostalData
     * const postalData = await prisma.postalData.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PostalDataUpdateManyArgs>(args: SelectSubset<T, PostalDataUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PostalData and returns the data updated in the database.
     * @param {PostalDataUpdateManyAndReturnArgs} args - Arguments to update many PostalData.
     * @example
     * // Update many PostalData
     * const postalData = await prisma.postalData.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more PostalData and only return the `id`
     * const postalDataWithIdOnly = await prisma.postalData.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PostalDataUpdateManyAndReturnArgs>(args: SelectSubset<T, PostalDataUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one PostalData.
     * @param {PostalDataUpsertArgs} args - Arguments to update or create a PostalData.
     * @example
     * // Update or create a PostalData
     * const postalData = await prisma.postalData.upsert({
     *   create: {
     *     // ... data to create a PostalData
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PostalData we want to update
     *   }
     * })
     */
    upsert<T extends PostalDataUpsertArgs>(args: SelectSubset<T, PostalDataUpsertArgs<ExtArgs>>): Prisma__PostalDataClient<$Result.GetResult<Prisma.$PostalDataPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PostalData.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostalDataCountArgs} args - Arguments to filter PostalData to count.
     * @example
     * // Count the number of PostalData
     * const count = await prisma.postalData.count({
     *   where: {
     *     // ... the filter for the PostalData we want to count
     *   }
     * })
    **/
    count<T extends PostalDataCountArgs>(
      args?: Subset<T, PostalDataCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PostalDataCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PostalData.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostalDataAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PostalDataAggregateArgs>(args: Subset<T, PostalDataAggregateArgs>): Prisma.PrismaPromise<GetPostalDataAggregateType<T>>

    /**
     * Group by PostalData.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostalDataGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PostalDataGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PostalDataGroupByArgs['orderBy'] }
        : { orderBy?: PostalDataGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PostalDataGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPostalDataGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PostalData model
   */
  readonly fields: PostalDataFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PostalData.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PostalDataClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PostalData model
   */
  interface PostalDataFieldRefs {
    readonly id: FieldRef<"PostalData", 'String'>
    readonly postalCode: FieldRef<"PostalData", 'String'>
    readonly subDistrict: FieldRef<"PostalData", 'String'>
    readonly district: FieldRef<"PostalData", 'String'>
    readonly province: FieldRef<"PostalData", 'String'>
    readonly createdAt: FieldRef<"PostalData", 'DateTime'>
    readonly updatedAt: FieldRef<"PostalData", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PostalData findUnique
   */
  export type PostalDataFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * Filter, which PostalData to fetch.
     */
    where: PostalDataWhereUniqueInput
  }

  /**
   * PostalData findUniqueOrThrow
   */
  export type PostalDataFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * Filter, which PostalData to fetch.
     */
    where: PostalDataWhereUniqueInput
  }

  /**
   * PostalData findFirst
   */
  export type PostalDataFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * Filter, which PostalData to fetch.
     */
    where?: PostalDataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PostalData to fetch.
     */
    orderBy?: PostalDataOrderByWithRelationInput | PostalDataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PostalData.
     */
    cursor?: PostalDataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PostalData from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PostalData.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PostalData.
     */
    distinct?: PostalDataScalarFieldEnum | PostalDataScalarFieldEnum[]
  }

  /**
   * PostalData findFirstOrThrow
   */
  export type PostalDataFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * Filter, which PostalData to fetch.
     */
    where?: PostalDataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PostalData to fetch.
     */
    orderBy?: PostalDataOrderByWithRelationInput | PostalDataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PostalData.
     */
    cursor?: PostalDataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PostalData from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PostalData.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PostalData.
     */
    distinct?: PostalDataScalarFieldEnum | PostalDataScalarFieldEnum[]
  }

  /**
   * PostalData findMany
   */
  export type PostalDataFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * Filter, which PostalData to fetch.
     */
    where?: PostalDataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PostalData to fetch.
     */
    orderBy?: PostalDataOrderByWithRelationInput | PostalDataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PostalData.
     */
    cursor?: PostalDataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PostalData from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PostalData.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PostalData.
     */
    distinct?: PostalDataScalarFieldEnum | PostalDataScalarFieldEnum[]
  }

  /**
   * PostalData create
   */
  export type PostalDataCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * The data needed to create a PostalData.
     */
    data: XOR<PostalDataCreateInput, PostalDataUncheckedCreateInput>
  }

  /**
   * PostalData createMany
   */
  export type PostalDataCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PostalData.
     */
    data: PostalDataCreateManyInput | PostalDataCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PostalData createManyAndReturn
   */
  export type PostalDataCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * The data used to create many PostalData.
     */
    data: PostalDataCreateManyInput | PostalDataCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PostalData update
   */
  export type PostalDataUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * The data needed to update a PostalData.
     */
    data: XOR<PostalDataUpdateInput, PostalDataUncheckedUpdateInput>
    /**
     * Choose, which PostalData to update.
     */
    where: PostalDataWhereUniqueInput
  }

  /**
   * PostalData updateMany
   */
  export type PostalDataUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PostalData.
     */
    data: XOR<PostalDataUpdateManyMutationInput, PostalDataUncheckedUpdateManyInput>
    /**
     * Filter which PostalData to update
     */
    where?: PostalDataWhereInput
    /**
     * Limit how many PostalData to update.
     */
    limit?: number
  }

  /**
   * PostalData updateManyAndReturn
   */
  export type PostalDataUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * The data used to update PostalData.
     */
    data: XOR<PostalDataUpdateManyMutationInput, PostalDataUncheckedUpdateManyInput>
    /**
     * Filter which PostalData to update
     */
    where?: PostalDataWhereInput
    /**
     * Limit how many PostalData to update.
     */
    limit?: number
  }

  /**
   * PostalData upsert
   */
  export type PostalDataUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * The filter to search for the PostalData to update in case it exists.
     */
    where: PostalDataWhereUniqueInput
    /**
     * In case the PostalData found by the `where` argument doesn't exist, create a new PostalData with this data.
     */
    create: XOR<PostalDataCreateInput, PostalDataUncheckedCreateInput>
    /**
     * In case the PostalData was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PostalDataUpdateInput, PostalDataUncheckedUpdateInput>
  }

  /**
   * PostalData delete
   */
  export type PostalDataDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
    /**
     * Filter which PostalData to delete.
     */
    where: PostalDataWhereUniqueInput
  }

  /**
   * PostalData deleteMany
   */
  export type PostalDataDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PostalData to delete
     */
    where?: PostalDataWhereInput
    /**
     * Limit how many PostalData to delete.
     */
    limit?: number
  }

  /**
   * PostalData without action
   */
  export type PostalDataDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PostalData
     */
    select?: PostalDataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the PostalData
     */
    omit?: PostalDataOmit<ExtArgs> | null
  }


  /**
   * Model Competitor
   */

  export type AggregateCompetitor = {
    _count: CompetitorCountAggregateOutputType | null
    _avg: CompetitorAvgAggregateOutputType | null
    _sum: CompetitorSumAggregateOutputType | null
    _min: CompetitorMinAggregateOutputType | null
    _max: CompetitorMaxAggregateOutputType | null
  }

  export type CompetitorAvgAggregateOutputType = {
    price: number | null
  }

  export type CompetitorSumAggregateOutputType = {
    price: number | null
  }

  export type CompetitorMinAggregateOutputType = {
    id: string | null
    name: string | null
    price: number | null
    promotion: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CompetitorMaxAggregateOutputType = {
    id: string | null
    name: string | null
    price: number | null
    promotion: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CompetitorCountAggregateOutputType = {
    id: number
    name: number
    price: number
    promotion: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CompetitorAvgAggregateInputType = {
    price?: true
  }

  export type CompetitorSumAggregateInputType = {
    price?: true
  }

  export type CompetitorMinAggregateInputType = {
    id?: true
    name?: true
    price?: true
    promotion?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CompetitorMaxAggregateInputType = {
    id?: true
    name?: true
    price?: true
    promotion?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CompetitorCountAggregateInputType = {
    id?: true
    name?: true
    price?: true
    promotion?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CompetitorAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Competitor to aggregate.
     */
    where?: CompetitorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Competitors to fetch.
     */
    orderBy?: CompetitorOrderByWithRelationInput | CompetitorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CompetitorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Competitors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Competitors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Competitors
    **/
    _count?: true | CompetitorCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CompetitorAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CompetitorSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CompetitorMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CompetitorMaxAggregateInputType
  }

  export type GetCompetitorAggregateType<T extends CompetitorAggregateArgs> = {
        [P in keyof T & keyof AggregateCompetitor]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCompetitor[P]>
      : GetScalarType<T[P], AggregateCompetitor[P]>
  }




  export type CompetitorGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CompetitorWhereInput
    orderBy?: CompetitorOrderByWithAggregationInput | CompetitorOrderByWithAggregationInput[]
    by: CompetitorScalarFieldEnum[] | CompetitorScalarFieldEnum
    having?: CompetitorScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CompetitorCountAggregateInputType | true
    _avg?: CompetitorAvgAggregateInputType
    _sum?: CompetitorSumAggregateInputType
    _min?: CompetitorMinAggregateInputType
    _max?: CompetitorMaxAggregateInputType
  }

  export type CompetitorGroupByOutputType = {
    id: string
    name: string
    price: number | null
    promotion: string | null
    createdAt: Date
    updatedAt: Date
    _count: CompetitorCountAggregateOutputType | null
    _avg: CompetitorAvgAggregateOutputType | null
    _sum: CompetitorSumAggregateOutputType | null
    _min: CompetitorMinAggregateOutputType | null
    _max: CompetitorMaxAggregateOutputType | null
  }

  type GetCompetitorGroupByPayload<T extends CompetitorGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CompetitorGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CompetitorGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CompetitorGroupByOutputType[P]>
            : GetScalarType<T[P], CompetitorGroupByOutputType[P]>
        }
      >
    >


  export type CompetitorSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    price?: boolean
    promotion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["competitor"]>

  export type CompetitorSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    price?: boolean
    promotion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["competitor"]>

  export type CompetitorSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    price?: boolean
    promotion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["competitor"]>

  export type CompetitorSelectScalar = {
    id?: boolean
    name?: boolean
    price?: boolean
    promotion?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CompetitorOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "price" | "promotion" | "createdAt" | "updatedAt", ExtArgs["result"]["competitor"]>

  export type $CompetitorPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Competitor"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      price: number | null
      promotion: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["competitor"]>
    composites: {}
  }

  type CompetitorGetPayload<S extends boolean | null | undefined | CompetitorDefaultArgs> = $Result.GetResult<Prisma.$CompetitorPayload, S>

  type CompetitorCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CompetitorFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CompetitorCountAggregateInputType | true
    }

  export interface CompetitorDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Competitor'], meta: { name: 'Competitor' } }
    /**
     * Find zero or one Competitor that matches the filter.
     * @param {CompetitorFindUniqueArgs} args - Arguments to find a Competitor
     * @example
     * // Get one Competitor
     * const competitor = await prisma.competitor.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CompetitorFindUniqueArgs>(args: SelectSubset<T, CompetitorFindUniqueArgs<ExtArgs>>): Prisma__CompetitorClient<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Competitor that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CompetitorFindUniqueOrThrowArgs} args - Arguments to find a Competitor
     * @example
     * // Get one Competitor
     * const competitor = await prisma.competitor.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CompetitorFindUniqueOrThrowArgs>(args: SelectSubset<T, CompetitorFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CompetitorClient<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Competitor that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompetitorFindFirstArgs} args - Arguments to find a Competitor
     * @example
     * // Get one Competitor
     * const competitor = await prisma.competitor.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CompetitorFindFirstArgs>(args?: SelectSubset<T, CompetitorFindFirstArgs<ExtArgs>>): Prisma__CompetitorClient<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Competitor that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompetitorFindFirstOrThrowArgs} args - Arguments to find a Competitor
     * @example
     * // Get one Competitor
     * const competitor = await prisma.competitor.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CompetitorFindFirstOrThrowArgs>(args?: SelectSubset<T, CompetitorFindFirstOrThrowArgs<ExtArgs>>): Prisma__CompetitorClient<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Competitors that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompetitorFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Competitors
     * const competitors = await prisma.competitor.findMany()
     * 
     * // Get first 10 Competitors
     * const competitors = await prisma.competitor.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const competitorWithIdOnly = await prisma.competitor.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CompetitorFindManyArgs>(args?: SelectSubset<T, CompetitorFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Competitor.
     * @param {CompetitorCreateArgs} args - Arguments to create a Competitor.
     * @example
     * // Create one Competitor
     * const Competitor = await prisma.competitor.create({
     *   data: {
     *     // ... data to create a Competitor
     *   }
     * })
     * 
     */
    create<T extends CompetitorCreateArgs>(args: SelectSubset<T, CompetitorCreateArgs<ExtArgs>>): Prisma__CompetitorClient<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Competitors.
     * @param {CompetitorCreateManyArgs} args - Arguments to create many Competitors.
     * @example
     * // Create many Competitors
     * const competitor = await prisma.competitor.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CompetitorCreateManyArgs>(args?: SelectSubset<T, CompetitorCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Competitors and returns the data saved in the database.
     * @param {CompetitorCreateManyAndReturnArgs} args - Arguments to create many Competitors.
     * @example
     * // Create many Competitors
     * const competitor = await prisma.competitor.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Competitors and only return the `id`
     * const competitorWithIdOnly = await prisma.competitor.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CompetitorCreateManyAndReturnArgs>(args?: SelectSubset<T, CompetitorCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Competitor.
     * @param {CompetitorDeleteArgs} args - Arguments to delete one Competitor.
     * @example
     * // Delete one Competitor
     * const Competitor = await prisma.competitor.delete({
     *   where: {
     *     // ... filter to delete one Competitor
     *   }
     * })
     * 
     */
    delete<T extends CompetitorDeleteArgs>(args: SelectSubset<T, CompetitorDeleteArgs<ExtArgs>>): Prisma__CompetitorClient<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Competitor.
     * @param {CompetitorUpdateArgs} args - Arguments to update one Competitor.
     * @example
     * // Update one Competitor
     * const competitor = await prisma.competitor.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CompetitorUpdateArgs>(args: SelectSubset<T, CompetitorUpdateArgs<ExtArgs>>): Prisma__CompetitorClient<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Competitors.
     * @param {CompetitorDeleteManyArgs} args - Arguments to filter Competitors to delete.
     * @example
     * // Delete a few Competitors
     * const { count } = await prisma.competitor.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CompetitorDeleteManyArgs>(args?: SelectSubset<T, CompetitorDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Competitors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompetitorUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Competitors
     * const competitor = await prisma.competitor.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CompetitorUpdateManyArgs>(args: SelectSubset<T, CompetitorUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Competitors and returns the data updated in the database.
     * @param {CompetitorUpdateManyAndReturnArgs} args - Arguments to update many Competitors.
     * @example
     * // Update many Competitors
     * const competitor = await prisma.competitor.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Competitors and only return the `id`
     * const competitorWithIdOnly = await prisma.competitor.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CompetitorUpdateManyAndReturnArgs>(args: SelectSubset<T, CompetitorUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Competitor.
     * @param {CompetitorUpsertArgs} args - Arguments to update or create a Competitor.
     * @example
     * // Update or create a Competitor
     * const competitor = await prisma.competitor.upsert({
     *   create: {
     *     // ... data to create a Competitor
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Competitor we want to update
     *   }
     * })
     */
    upsert<T extends CompetitorUpsertArgs>(args: SelectSubset<T, CompetitorUpsertArgs<ExtArgs>>): Prisma__CompetitorClient<$Result.GetResult<Prisma.$CompetitorPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Competitors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompetitorCountArgs} args - Arguments to filter Competitors to count.
     * @example
     * // Count the number of Competitors
     * const count = await prisma.competitor.count({
     *   where: {
     *     // ... the filter for the Competitors we want to count
     *   }
     * })
    **/
    count<T extends CompetitorCountArgs>(
      args?: Subset<T, CompetitorCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CompetitorCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Competitor.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompetitorAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CompetitorAggregateArgs>(args: Subset<T, CompetitorAggregateArgs>): Prisma.PrismaPromise<GetCompetitorAggregateType<T>>

    /**
     * Group by Competitor.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CompetitorGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CompetitorGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CompetitorGroupByArgs['orderBy'] }
        : { orderBy?: CompetitorGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CompetitorGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCompetitorGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Competitor model
   */
  readonly fields: CompetitorFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Competitor.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CompetitorClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Competitor model
   */
  interface CompetitorFieldRefs {
    readonly id: FieldRef<"Competitor", 'String'>
    readonly name: FieldRef<"Competitor", 'String'>
    readonly price: FieldRef<"Competitor", 'Float'>
    readonly promotion: FieldRef<"Competitor", 'String'>
    readonly createdAt: FieldRef<"Competitor", 'DateTime'>
    readonly updatedAt: FieldRef<"Competitor", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Competitor findUnique
   */
  export type CompetitorFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * Filter, which Competitor to fetch.
     */
    where: CompetitorWhereUniqueInput
  }

  /**
   * Competitor findUniqueOrThrow
   */
  export type CompetitorFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * Filter, which Competitor to fetch.
     */
    where: CompetitorWhereUniqueInput
  }

  /**
   * Competitor findFirst
   */
  export type CompetitorFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * Filter, which Competitor to fetch.
     */
    where?: CompetitorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Competitors to fetch.
     */
    orderBy?: CompetitorOrderByWithRelationInput | CompetitorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Competitors.
     */
    cursor?: CompetitorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Competitors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Competitors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Competitors.
     */
    distinct?: CompetitorScalarFieldEnum | CompetitorScalarFieldEnum[]
  }

  /**
   * Competitor findFirstOrThrow
   */
  export type CompetitorFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * Filter, which Competitor to fetch.
     */
    where?: CompetitorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Competitors to fetch.
     */
    orderBy?: CompetitorOrderByWithRelationInput | CompetitorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Competitors.
     */
    cursor?: CompetitorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Competitors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Competitors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Competitors.
     */
    distinct?: CompetitorScalarFieldEnum | CompetitorScalarFieldEnum[]
  }

  /**
   * Competitor findMany
   */
  export type CompetitorFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * Filter, which Competitors to fetch.
     */
    where?: CompetitorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Competitors to fetch.
     */
    orderBy?: CompetitorOrderByWithRelationInput | CompetitorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Competitors.
     */
    cursor?: CompetitorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Competitors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Competitors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Competitors.
     */
    distinct?: CompetitorScalarFieldEnum | CompetitorScalarFieldEnum[]
  }

  /**
   * Competitor create
   */
  export type CompetitorCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * The data needed to create a Competitor.
     */
    data: XOR<CompetitorCreateInput, CompetitorUncheckedCreateInput>
  }

  /**
   * Competitor createMany
   */
  export type CompetitorCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Competitors.
     */
    data: CompetitorCreateManyInput | CompetitorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Competitor createManyAndReturn
   */
  export type CompetitorCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * The data used to create many Competitors.
     */
    data: CompetitorCreateManyInput | CompetitorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Competitor update
   */
  export type CompetitorUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * The data needed to update a Competitor.
     */
    data: XOR<CompetitorUpdateInput, CompetitorUncheckedUpdateInput>
    /**
     * Choose, which Competitor to update.
     */
    where: CompetitorWhereUniqueInput
  }

  /**
   * Competitor updateMany
   */
  export type CompetitorUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Competitors.
     */
    data: XOR<CompetitorUpdateManyMutationInput, CompetitorUncheckedUpdateManyInput>
    /**
     * Filter which Competitors to update
     */
    where?: CompetitorWhereInput
    /**
     * Limit how many Competitors to update.
     */
    limit?: number
  }

  /**
   * Competitor updateManyAndReturn
   */
  export type CompetitorUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * The data used to update Competitors.
     */
    data: XOR<CompetitorUpdateManyMutationInput, CompetitorUncheckedUpdateManyInput>
    /**
     * Filter which Competitors to update
     */
    where?: CompetitorWhereInput
    /**
     * Limit how many Competitors to update.
     */
    limit?: number
  }

  /**
   * Competitor upsert
   */
  export type CompetitorUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * The filter to search for the Competitor to update in case it exists.
     */
    where: CompetitorWhereUniqueInput
    /**
     * In case the Competitor found by the `where` argument doesn't exist, create a new Competitor with this data.
     */
    create: XOR<CompetitorCreateInput, CompetitorUncheckedCreateInput>
    /**
     * In case the Competitor was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CompetitorUpdateInput, CompetitorUncheckedUpdateInput>
  }

  /**
   * Competitor delete
   */
  export type CompetitorDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
    /**
     * Filter which Competitor to delete.
     */
    where: CompetitorWhereUniqueInput
  }

  /**
   * Competitor deleteMany
   */
  export type CompetitorDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Competitors to delete
     */
    where?: CompetitorWhereInput
    /**
     * Limit how many Competitors to delete.
     */
    limit?: number
  }

  /**
   * Competitor without action
   */
  export type CompetitorDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Competitor
     */
    select?: CompetitorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Competitor
     */
    omit?: CompetitorOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    employeeId: 'employeeId',
    email: 'email',
    fullName: 'fullName',
    phoneNumber: 'phoneNumber',
    role: 'role',
    position: 'position',
    password: 'password',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    otpCode: 'otpCode',
    otpExpiresAt: 'otpExpiresAt',
    isActive: 'isActive'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const MonthlyTargetScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    month: 'month',
    year: 'year',
    amount: 'amount',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MonthlyTargetScalarFieldEnum = (typeof MonthlyTargetScalarFieldEnum)[keyof typeof MonthlyTargetScalarFieldEnum]


  export const ScheduleScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    title: 'title',
    description: 'description',
    date: 'date',
    status: 'status',
    presentationStatus: 'presentationStatus',
    quotationNumber: 'quotationNumber',
    poNumber: 'poNumber',
    invoiceNumber: 'invoiceNumber',
    notes: 'notes',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    companyId: 'companyId'
  };

  export type ScheduleScalarFieldEnum = (typeof ScheduleScalarFieldEnum)[keyof typeof ScheduleScalarFieldEnum]


  export const EmployeeSaleScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    employeeId: 'employeeId',
    fullName: 'fullName',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    nickname: 'nickname',
    branch: 'branch',
    teamLeader: 'teamLeader',
    position: 'position',
    department: 'department',
    startDate: 'startDate'
  };

  export type EmployeeSaleScalarFieldEnum = (typeof EmployeeSaleScalarFieldEnum)[keyof typeof EmployeeSaleScalarFieldEnum]


  export const CompanyScalarFieldEnum: {
    id: 'id',
    companyName: 'companyName',
    taxId: 'taxId',
    address: 'address',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    area: 'area',
    branchOrHeadOffice: 'branchOrHeadOffice',
    businessType: 'businessType',
    customerAccessChannel: 'customerAccessChannel',
    customerStatus: 'customerStatus',
    customerType: 'customerType',
    district: 'district',
    postalCode: 'postalCode',
    province: 'province',
    subDistrict: 'subDistrict',
    assignedUserId: 'assignedUserId'
  };

  export type CompanyScalarFieldEnum = (typeof CompanyScalarFieldEnum)[keyof typeof CompanyScalarFieldEnum]


  export const ContactScalarFieldEnum: {
    id: 'id',
    companyId: 'companyId',
    contactName: 'contactName',
    position: 'position',
    mobilePhone: 'mobilePhone',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ContactScalarFieldEnum = (typeof ContactScalarFieldEnum)[keyof typeof ContactScalarFieldEnum]


  export const QuotationScalarFieldEnum: {
    id: 'id',
    companyId: 'companyId',
    status: 'status',
    salesBeforeVat: 'salesBeforeVat',
    transportationFee: 'transportationFee',
    installationFee: 'installationFee',
    totalAmountBeforeVat: 'totalAmountBeforeVat',
    actualClosingAmount: 'actualClosingAmount',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    billingDate: 'billingDate',
    contactId: 'contactId',
    followUp1: 'followUp1',
    followUp2: 'followUp2',
    followUp3: 'followUp3',
    followUp4: 'followUp4',
    invoiceNumber: 'invoiceNumber',
    poDate: 'poDate',
    productType: 'productType',
    quotationDate: 'quotationDate',
    quotationNumber: 'quotationNumber',
    rejectReason: 'rejectReason',
    remarks: 'remarks',
    requirementDate: 'requirementDate',
    requirementNumber: 'requirementNumber',
    salesBranch: 'salesBranch',
    salesTeamLeader: 'salesTeamLeader',
    salespersonId: 'salespersonId',
    subject: 'subject',
    winLossReason: 'winLossReason'
  };

  export type QuotationScalarFieldEnum = (typeof QuotationScalarFieldEnum)[keyof typeof QuotationScalarFieldEnum]


  export const TelesaleScalarFieldEnum: {
    id: 'id',
    companyId: 'companyId',
    userId: 'userId',
    conversationSummary: 'conversationSummary',
    needsOrProblems: 'needsOrProblems',
    meetingObjective: 'meetingObjective',
    competitorName: 'competitorName',
    competitorPrice: 'competitorPrice',
    competitorPromotion: 'competitorPromotion',
    lastMeetingDate: 'lastMeetingDate',
    result: 'result',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    callDate: 'callDate',
    callOutcome: 'callOutcome',
    callStatus: 'callStatus',
    forwardTo: 'forwardTo',
    callbackAt: 'callbackAt'
  };

  export type TelesaleScalarFieldEnum = (typeof TelesaleScalarFieldEnum)[keyof typeof TelesaleScalarFieldEnum]


  export const BusinessTypeScalarFieldEnum: {
    id: 'id',
    name: 'name',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type BusinessTypeScalarFieldEnum = (typeof BusinessTypeScalarFieldEnum)[keyof typeof BusinessTypeScalarFieldEnum]


  export const PostalDataScalarFieldEnum: {
    id: 'id',
    postalCode: 'postalCode',
    subDistrict: 'subDistrict',
    district: 'district',
    province: 'province',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type PostalDataScalarFieldEnum = (typeof PostalDataScalarFieldEnum)[keyof typeof PostalDataScalarFieldEnum]


  export const CompetitorScalarFieldEnum: {
    id: 'id',
    name: 'name',
    price: 'price',
    promotion: 'promotion',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CompetitorScalarFieldEnum = (typeof CompetitorScalarFieldEnum)[keyof typeof CompetitorScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    employeeId?: StringFilter<"User"> | string
    email?: StringNullableFilter<"User"> | string | null
    fullName?: StringFilter<"User"> | string
    phoneNumber?: StringNullableFilter<"User"> | string | null
    role?: StringFilter<"User"> | string
    position?: StringNullableFilter<"User"> | string | null
    password?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    otpCode?: StringNullableFilter<"User"> | string | null
    otpExpiresAt?: DateTimeNullableFilter<"User"> | Date | string | null
    isActive?: BoolFilter<"User"> | boolean
    quotations?: QuotationListRelationFilter
    schedules?: ScheduleListRelationFilter
    telesales?: TelesaleListRelationFilter
    employeeSale?: XOR<EmployeeSaleNullableScalarRelationFilter, EmployeeSaleWhereInput> | null
    monthlyTargets?: MonthlyTargetListRelationFilter
    assignedCompanies?: CompanyListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    employeeId?: SortOrder
    email?: SortOrderInput | SortOrder
    fullName?: SortOrder
    phoneNumber?: SortOrderInput | SortOrder
    role?: SortOrder
    position?: SortOrderInput | SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    otpCode?: SortOrderInput | SortOrder
    otpExpiresAt?: SortOrderInput | SortOrder
    isActive?: SortOrder
    quotations?: QuotationOrderByRelationAggregateInput
    schedules?: ScheduleOrderByRelationAggregateInput
    telesales?: TelesaleOrderByRelationAggregateInput
    employeeSale?: EmployeeSaleOrderByWithRelationInput
    monthlyTargets?: MonthlyTargetOrderByRelationAggregateInput
    assignedCompanies?: CompanyOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    employeeId?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    fullName?: StringFilter<"User"> | string
    phoneNumber?: StringNullableFilter<"User"> | string | null
    role?: StringFilter<"User"> | string
    position?: StringNullableFilter<"User"> | string | null
    password?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    otpCode?: StringNullableFilter<"User"> | string | null
    otpExpiresAt?: DateTimeNullableFilter<"User"> | Date | string | null
    isActive?: BoolFilter<"User"> | boolean
    quotations?: QuotationListRelationFilter
    schedules?: ScheduleListRelationFilter
    telesales?: TelesaleListRelationFilter
    employeeSale?: XOR<EmployeeSaleNullableScalarRelationFilter, EmployeeSaleWhereInput> | null
    monthlyTargets?: MonthlyTargetListRelationFilter
    assignedCompanies?: CompanyListRelationFilter
  }, "id" | "employeeId" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    employeeId?: SortOrder
    email?: SortOrderInput | SortOrder
    fullName?: SortOrder
    phoneNumber?: SortOrderInput | SortOrder
    role?: SortOrder
    position?: SortOrderInput | SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    otpCode?: SortOrderInput | SortOrder
    otpExpiresAt?: SortOrderInput | SortOrder
    isActive?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    employeeId?: StringWithAggregatesFilter<"User"> | string
    email?: StringNullableWithAggregatesFilter<"User"> | string | null
    fullName?: StringWithAggregatesFilter<"User"> | string
    phoneNumber?: StringNullableWithAggregatesFilter<"User"> | string | null
    role?: StringWithAggregatesFilter<"User"> | string
    position?: StringNullableWithAggregatesFilter<"User"> | string | null
    password?: StringWithAggregatesFilter<"User"> | string
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    otpCode?: StringNullableWithAggregatesFilter<"User"> | string | null
    otpExpiresAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    isActive?: BoolWithAggregatesFilter<"User"> | boolean
  }

  export type MonthlyTargetWhereInput = {
    AND?: MonthlyTargetWhereInput | MonthlyTargetWhereInput[]
    OR?: MonthlyTargetWhereInput[]
    NOT?: MonthlyTargetWhereInput | MonthlyTargetWhereInput[]
    id?: StringFilter<"MonthlyTarget"> | string
    userId?: StringNullableFilter<"MonthlyTarget"> | string | null
    month?: IntFilter<"MonthlyTarget"> | number
    year?: IntFilter<"MonthlyTarget"> | number
    amount?: FloatFilter<"MonthlyTarget"> | number
    createdAt?: DateTimeFilter<"MonthlyTarget"> | Date | string
    updatedAt?: DateTimeFilter<"MonthlyTarget"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type MonthlyTargetOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    month?: SortOrder
    year?: SortOrder
    amount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type MonthlyTargetWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_month_year?: MonthlyTargetUserIdMonthYearCompoundUniqueInput
    AND?: MonthlyTargetWhereInput | MonthlyTargetWhereInput[]
    OR?: MonthlyTargetWhereInput[]
    NOT?: MonthlyTargetWhereInput | MonthlyTargetWhereInput[]
    userId?: StringNullableFilter<"MonthlyTarget"> | string | null
    month?: IntFilter<"MonthlyTarget"> | number
    year?: IntFilter<"MonthlyTarget"> | number
    amount?: FloatFilter<"MonthlyTarget"> | number
    createdAt?: DateTimeFilter<"MonthlyTarget"> | Date | string
    updatedAt?: DateTimeFilter<"MonthlyTarget"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id" | "userId_month_year">

  export type MonthlyTargetOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    month?: SortOrder
    year?: SortOrder
    amount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MonthlyTargetCountOrderByAggregateInput
    _avg?: MonthlyTargetAvgOrderByAggregateInput
    _max?: MonthlyTargetMaxOrderByAggregateInput
    _min?: MonthlyTargetMinOrderByAggregateInput
    _sum?: MonthlyTargetSumOrderByAggregateInput
  }

  export type MonthlyTargetScalarWhereWithAggregatesInput = {
    AND?: MonthlyTargetScalarWhereWithAggregatesInput | MonthlyTargetScalarWhereWithAggregatesInput[]
    OR?: MonthlyTargetScalarWhereWithAggregatesInput[]
    NOT?: MonthlyTargetScalarWhereWithAggregatesInput | MonthlyTargetScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MonthlyTarget"> | string
    userId?: StringNullableWithAggregatesFilter<"MonthlyTarget"> | string | null
    month?: IntWithAggregatesFilter<"MonthlyTarget"> | number
    year?: IntWithAggregatesFilter<"MonthlyTarget"> | number
    amount?: FloatWithAggregatesFilter<"MonthlyTarget"> | number
    createdAt?: DateTimeWithAggregatesFilter<"MonthlyTarget"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MonthlyTarget"> | Date | string
  }

  export type ScheduleWhereInput = {
    AND?: ScheduleWhereInput | ScheduleWhereInput[]
    OR?: ScheduleWhereInput[]
    NOT?: ScheduleWhereInput | ScheduleWhereInput[]
    id?: StringFilter<"Schedule"> | string
    userId?: StringFilter<"Schedule"> | string
    title?: StringFilter<"Schedule"> | string
    description?: StringNullableFilter<"Schedule"> | string | null
    date?: DateTimeFilter<"Schedule"> | Date | string
    status?: StringFilter<"Schedule"> | string
    presentationStatus?: StringNullableFilter<"Schedule"> | string | null
    quotationNumber?: StringNullableFilter<"Schedule"> | string | null
    poNumber?: StringNullableFilter<"Schedule"> | string | null
    invoiceNumber?: StringNullableFilter<"Schedule"> | string | null
    notes?: StringNullableFilter<"Schedule"> | string | null
    createdAt?: DateTimeFilter<"Schedule"> | Date | string
    updatedAt?: DateTimeFilter<"Schedule"> | Date | string
    companyId?: StringNullableFilter<"Schedule"> | string | null
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    company?: XOR<CompanyNullableScalarRelationFilter, CompanyWhereInput> | null
  }

  export type ScheduleOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    date?: SortOrder
    status?: SortOrder
    presentationStatus?: SortOrderInput | SortOrder
    quotationNumber?: SortOrderInput | SortOrder
    poNumber?: SortOrderInput | SortOrder
    invoiceNumber?: SortOrderInput | SortOrder
    notes?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyId?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
    company?: CompanyOrderByWithRelationInput
  }

  export type ScheduleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ScheduleWhereInput | ScheduleWhereInput[]
    OR?: ScheduleWhereInput[]
    NOT?: ScheduleWhereInput | ScheduleWhereInput[]
    userId?: StringFilter<"Schedule"> | string
    title?: StringFilter<"Schedule"> | string
    description?: StringNullableFilter<"Schedule"> | string | null
    date?: DateTimeFilter<"Schedule"> | Date | string
    status?: StringFilter<"Schedule"> | string
    presentationStatus?: StringNullableFilter<"Schedule"> | string | null
    quotationNumber?: StringNullableFilter<"Schedule"> | string | null
    poNumber?: StringNullableFilter<"Schedule"> | string | null
    invoiceNumber?: StringNullableFilter<"Schedule"> | string | null
    notes?: StringNullableFilter<"Schedule"> | string | null
    createdAt?: DateTimeFilter<"Schedule"> | Date | string
    updatedAt?: DateTimeFilter<"Schedule"> | Date | string
    companyId?: StringNullableFilter<"Schedule"> | string | null
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    company?: XOR<CompanyNullableScalarRelationFilter, CompanyWhereInput> | null
  }, "id">

  export type ScheduleOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    date?: SortOrder
    status?: SortOrder
    presentationStatus?: SortOrderInput | SortOrder
    quotationNumber?: SortOrderInput | SortOrder
    poNumber?: SortOrderInput | SortOrder
    invoiceNumber?: SortOrderInput | SortOrder
    notes?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyId?: SortOrderInput | SortOrder
    _count?: ScheduleCountOrderByAggregateInput
    _max?: ScheduleMaxOrderByAggregateInput
    _min?: ScheduleMinOrderByAggregateInput
  }

  export type ScheduleScalarWhereWithAggregatesInput = {
    AND?: ScheduleScalarWhereWithAggregatesInput | ScheduleScalarWhereWithAggregatesInput[]
    OR?: ScheduleScalarWhereWithAggregatesInput[]
    NOT?: ScheduleScalarWhereWithAggregatesInput | ScheduleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Schedule"> | string
    userId?: StringWithAggregatesFilter<"Schedule"> | string
    title?: StringWithAggregatesFilter<"Schedule"> | string
    description?: StringNullableWithAggregatesFilter<"Schedule"> | string | null
    date?: DateTimeWithAggregatesFilter<"Schedule"> | Date | string
    status?: StringWithAggregatesFilter<"Schedule"> | string
    presentationStatus?: StringNullableWithAggregatesFilter<"Schedule"> | string | null
    quotationNumber?: StringNullableWithAggregatesFilter<"Schedule"> | string | null
    poNumber?: StringNullableWithAggregatesFilter<"Schedule"> | string | null
    invoiceNumber?: StringNullableWithAggregatesFilter<"Schedule"> | string | null
    notes?: StringNullableWithAggregatesFilter<"Schedule"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Schedule"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Schedule"> | Date | string
    companyId?: StringNullableWithAggregatesFilter<"Schedule"> | string | null
  }

  export type EmployeeSaleWhereInput = {
    AND?: EmployeeSaleWhereInput | EmployeeSaleWhereInput[]
    OR?: EmployeeSaleWhereInput[]
    NOT?: EmployeeSaleWhereInput | EmployeeSaleWhereInput[]
    id?: StringFilter<"EmployeeSale"> | string
    userId?: StringNullableFilter<"EmployeeSale"> | string | null
    employeeId?: StringNullableFilter<"EmployeeSale"> | string | null
    fullName?: StringFilter<"EmployeeSale"> | string
    createdAt?: DateTimeFilter<"EmployeeSale"> | Date | string
    updatedAt?: DateTimeFilter<"EmployeeSale"> | Date | string
    nickname?: StringNullableFilter<"EmployeeSale"> | string | null
    branch?: StringNullableFilter<"EmployeeSale"> | string | null
    teamLeader?: StringNullableFilter<"EmployeeSale"> | string | null
    position?: StringNullableFilter<"EmployeeSale"> | string | null
    department?: StringNullableFilter<"EmployeeSale"> | string | null
    startDate?: DateTimeNullableFilter<"EmployeeSale"> | Date | string | null
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type EmployeeSaleOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    employeeId?: SortOrderInput | SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    nickname?: SortOrderInput | SortOrder
    branch?: SortOrderInput | SortOrder
    teamLeader?: SortOrderInput | SortOrder
    position?: SortOrderInput | SortOrder
    department?: SortOrderInput | SortOrder
    startDate?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type EmployeeSaleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId?: string
    employeeId?: string
    AND?: EmployeeSaleWhereInput | EmployeeSaleWhereInput[]
    OR?: EmployeeSaleWhereInput[]
    NOT?: EmployeeSaleWhereInput | EmployeeSaleWhereInput[]
    fullName?: StringFilter<"EmployeeSale"> | string
    createdAt?: DateTimeFilter<"EmployeeSale"> | Date | string
    updatedAt?: DateTimeFilter<"EmployeeSale"> | Date | string
    nickname?: StringNullableFilter<"EmployeeSale"> | string | null
    branch?: StringNullableFilter<"EmployeeSale"> | string | null
    teamLeader?: StringNullableFilter<"EmployeeSale"> | string | null
    position?: StringNullableFilter<"EmployeeSale"> | string | null
    department?: StringNullableFilter<"EmployeeSale"> | string | null
    startDate?: DateTimeNullableFilter<"EmployeeSale"> | Date | string | null
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id" | "userId" | "employeeId">

  export type EmployeeSaleOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    employeeId?: SortOrderInput | SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    nickname?: SortOrderInput | SortOrder
    branch?: SortOrderInput | SortOrder
    teamLeader?: SortOrderInput | SortOrder
    position?: SortOrderInput | SortOrder
    department?: SortOrderInput | SortOrder
    startDate?: SortOrderInput | SortOrder
    _count?: EmployeeSaleCountOrderByAggregateInput
    _max?: EmployeeSaleMaxOrderByAggregateInput
    _min?: EmployeeSaleMinOrderByAggregateInput
  }

  export type EmployeeSaleScalarWhereWithAggregatesInput = {
    AND?: EmployeeSaleScalarWhereWithAggregatesInput | EmployeeSaleScalarWhereWithAggregatesInput[]
    OR?: EmployeeSaleScalarWhereWithAggregatesInput[]
    NOT?: EmployeeSaleScalarWhereWithAggregatesInput | EmployeeSaleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"EmployeeSale"> | string
    userId?: StringNullableWithAggregatesFilter<"EmployeeSale"> | string | null
    employeeId?: StringNullableWithAggregatesFilter<"EmployeeSale"> | string | null
    fullName?: StringWithAggregatesFilter<"EmployeeSale"> | string
    createdAt?: DateTimeWithAggregatesFilter<"EmployeeSale"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"EmployeeSale"> | Date | string
    nickname?: StringNullableWithAggregatesFilter<"EmployeeSale"> | string | null
    branch?: StringNullableWithAggregatesFilter<"EmployeeSale"> | string | null
    teamLeader?: StringNullableWithAggregatesFilter<"EmployeeSale"> | string | null
    position?: StringNullableWithAggregatesFilter<"EmployeeSale"> | string | null
    department?: StringNullableWithAggregatesFilter<"EmployeeSale"> | string | null
    startDate?: DateTimeNullableWithAggregatesFilter<"EmployeeSale"> | Date | string | null
  }

  export type CompanyWhereInput = {
    AND?: CompanyWhereInput | CompanyWhereInput[]
    OR?: CompanyWhereInput[]
    NOT?: CompanyWhereInput | CompanyWhereInput[]
    id?: StringFilter<"Company"> | string
    companyName?: StringFilter<"Company"> | string
    taxId?: StringNullableFilter<"Company"> | string | null
    address?: StringNullableFilter<"Company"> | string | null
    createdAt?: DateTimeFilter<"Company"> | Date | string
    updatedAt?: DateTimeFilter<"Company"> | Date | string
    area?: StringNullableFilter<"Company"> | string | null
    branchOrHeadOffice?: StringNullableFilter<"Company"> | string | null
    businessType?: StringNullableFilter<"Company"> | string | null
    customerAccessChannel?: StringNullableFilter<"Company"> | string | null
    customerStatus?: StringNullableFilter<"Company"> | string | null
    customerType?: StringNullableFilter<"Company"> | string | null
    district?: StringNullableFilter<"Company"> | string | null
    postalCode?: StringNullableFilter<"Company"> | string | null
    province?: StringNullableFilter<"Company"> | string | null
    subDistrict?: StringNullableFilter<"Company"> | string | null
    assignedUserId?: StringNullableFilter<"Company"> | string | null
    contacts?: ContactListRelationFilter
    quotations?: QuotationListRelationFilter
    telesales?: TelesaleListRelationFilter
    schedules?: ScheduleListRelationFilter
    assignedUser?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type CompanyOrderByWithRelationInput = {
    id?: SortOrder
    companyName?: SortOrder
    taxId?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    area?: SortOrderInput | SortOrder
    branchOrHeadOffice?: SortOrderInput | SortOrder
    businessType?: SortOrderInput | SortOrder
    customerAccessChannel?: SortOrderInput | SortOrder
    customerStatus?: SortOrderInput | SortOrder
    customerType?: SortOrderInput | SortOrder
    district?: SortOrderInput | SortOrder
    postalCode?: SortOrderInput | SortOrder
    province?: SortOrderInput | SortOrder
    subDistrict?: SortOrderInput | SortOrder
    assignedUserId?: SortOrderInput | SortOrder
    contacts?: ContactOrderByRelationAggregateInput
    quotations?: QuotationOrderByRelationAggregateInput
    telesales?: TelesaleOrderByRelationAggregateInput
    schedules?: ScheduleOrderByRelationAggregateInput
    assignedUser?: UserOrderByWithRelationInput
  }

  export type CompanyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CompanyWhereInput | CompanyWhereInput[]
    OR?: CompanyWhereInput[]
    NOT?: CompanyWhereInput | CompanyWhereInput[]
    companyName?: StringFilter<"Company"> | string
    taxId?: StringNullableFilter<"Company"> | string | null
    address?: StringNullableFilter<"Company"> | string | null
    createdAt?: DateTimeFilter<"Company"> | Date | string
    updatedAt?: DateTimeFilter<"Company"> | Date | string
    area?: StringNullableFilter<"Company"> | string | null
    branchOrHeadOffice?: StringNullableFilter<"Company"> | string | null
    businessType?: StringNullableFilter<"Company"> | string | null
    customerAccessChannel?: StringNullableFilter<"Company"> | string | null
    customerStatus?: StringNullableFilter<"Company"> | string | null
    customerType?: StringNullableFilter<"Company"> | string | null
    district?: StringNullableFilter<"Company"> | string | null
    postalCode?: StringNullableFilter<"Company"> | string | null
    province?: StringNullableFilter<"Company"> | string | null
    subDistrict?: StringNullableFilter<"Company"> | string | null
    assignedUserId?: StringNullableFilter<"Company"> | string | null
    contacts?: ContactListRelationFilter
    quotations?: QuotationListRelationFilter
    telesales?: TelesaleListRelationFilter
    schedules?: ScheduleListRelationFilter
    assignedUser?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type CompanyOrderByWithAggregationInput = {
    id?: SortOrder
    companyName?: SortOrder
    taxId?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    area?: SortOrderInput | SortOrder
    branchOrHeadOffice?: SortOrderInput | SortOrder
    businessType?: SortOrderInput | SortOrder
    customerAccessChannel?: SortOrderInput | SortOrder
    customerStatus?: SortOrderInput | SortOrder
    customerType?: SortOrderInput | SortOrder
    district?: SortOrderInput | SortOrder
    postalCode?: SortOrderInput | SortOrder
    province?: SortOrderInput | SortOrder
    subDistrict?: SortOrderInput | SortOrder
    assignedUserId?: SortOrderInput | SortOrder
    _count?: CompanyCountOrderByAggregateInput
    _max?: CompanyMaxOrderByAggregateInput
    _min?: CompanyMinOrderByAggregateInput
  }

  export type CompanyScalarWhereWithAggregatesInput = {
    AND?: CompanyScalarWhereWithAggregatesInput | CompanyScalarWhereWithAggregatesInput[]
    OR?: CompanyScalarWhereWithAggregatesInput[]
    NOT?: CompanyScalarWhereWithAggregatesInput | CompanyScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Company"> | string
    companyName?: StringWithAggregatesFilter<"Company"> | string
    taxId?: StringNullableWithAggregatesFilter<"Company"> | string | null
    address?: StringNullableWithAggregatesFilter<"Company"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Company"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Company"> | Date | string
    area?: StringNullableWithAggregatesFilter<"Company"> | string | null
    branchOrHeadOffice?: StringNullableWithAggregatesFilter<"Company"> | string | null
    businessType?: StringNullableWithAggregatesFilter<"Company"> | string | null
    customerAccessChannel?: StringNullableWithAggregatesFilter<"Company"> | string | null
    customerStatus?: StringNullableWithAggregatesFilter<"Company"> | string | null
    customerType?: StringNullableWithAggregatesFilter<"Company"> | string | null
    district?: StringNullableWithAggregatesFilter<"Company"> | string | null
    postalCode?: StringNullableWithAggregatesFilter<"Company"> | string | null
    province?: StringNullableWithAggregatesFilter<"Company"> | string | null
    subDistrict?: StringNullableWithAggregatesFilter<"Company"> | string | null
    assignedUserId?: StringNullableWithAggregatesFilter<"Company"> | string | null
  }

  export type ContactWhereInput = {
    AND?: ContactWhereInput | ContactWhereInput[]
    OR?: ContactWhereInput[]
    NOT?: ContactWhereInput | ContactWhereInput[]
    id?: StringFilter<"Contact"> | string
    companyId?: StringFilter<"Contact"> | string
    contactName?: StringFilter<"Contact"> | string
    position?: StringNullableFilter<"Contact"> | string | null
    mobilePhone?: StringNullableFilter<"Contact"> | string | null
    createdAt?: DateTimeFilter<"Contact"> | Date | string
    updatedAt?: DateTimeFilter<"Contact"> | Date | string
    company?: XOR<CompanyScalarRelationFilter, CompanyWhereInput>
    quotations?: QuotationListRelationFilter
  }

  export type ContactOrderByWithRelationInput = {
    id?: SortOrder
    companyId?: SortOrder
    contactName?: SortOrder
    position?: SortOrderInput | SortOrder
    mobilePhone?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    company?: CompanyOrderByWithRelationInput
    quotations?: QuotationOrderByRelationAggregateInput
  }

  export type ContactWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ContactWhereInput | ContactWhereInput[]
    OR?: ContactWhereInput[]
    NOT?: ContactWhereInput | ContactWhereInput[]
    companyId?: StringFilter<"Contact"> | string
    contactName?: StringFilter<"Contact"> | string
    position?: StringNullableFilter<"Contact"> | string | null
    mobilePhone?: StringNullableFilter<"Contact"> | string | null
    createdAt?: DateTimeFilter<"Contact"> | Date | string
    updatedAt?: DateTimeFilter<"Contact"> | Date | string
    company?: XOR<CompanyScalarRelationFilter, CompanyWhereInput>
    quotations?: QuotationListRelationFilter
  }, "id">

  export type ContactOrderByWithAggregationInput = {
    id?: SortOrder
    companyId?: SortOrder
    contactName?: SortOrder
    position?: SortOrderInput | SortOrder
    mobilePhone?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ContactCountOrderByAggregateInput
    _max?: ContactMaxOrderByAggregateInput
    _min?: ContactMinOrderByAggregateInput
  }

  export type ContactScalarWhereWithAggregatesInput = {
    AND?: ContactScalarWhereWithAggregatesInput | ContactScalarWhereWithAggregatesInput[]
    OR?: ContactScalarWhereWithAggregatesInput[]
    NOT?: ContactScalarWhereWithAggregatesInput | ContactScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Contact"> | string
    companyId?: StringWithAggregatesFilter<"Contact"> | string
    contactName?: StringWithAggregatesFilter<"Contact"> | string
    position?: StringNullableWithAggregatesFilter<"Contact"> | string | null
    mobilePhone?: StringNullableWithAggregatesFilter<"Contact"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Contact"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Contact"> | Date | string
  }

  export type QuotationWhereInput = {
    AND?: QuotationWhereInput | QuotationWhereInput[]
    OR?: QuotationWhereInput[]
    NOT?: QuotationWhereInput | QuotationWhereInput[]
    id?: StringFilter<"Quotation"> | string
    companyId?: StringFilter<"Quotation"> | string
    status?: StringFilter<"Quotation"> | string
    salesBeforeVat?: FloatNullableFilter<"Quotation"> | number | null
    transportationFee?: FloatNullableFilter<"Quotation"> | number | null
    installationFee?: FloatNullableFilter<"Quotation"> | number | null
    totalAmountBeforeVat?: FloatNullableFilter<"Quotation"> | number | null
    actualClosingAmount?: FloatNullableFilter<"Quotation"> | number | null
    createdAt?: DateTimeFilter<"Quotation"> | Date | string
    updatedAt?: DateTimeFilter<"Quotation"> | Date | string
    billingDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    contactId?: StringNullableFilter<"Quotation"> | string | null
    followUp1?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp2?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp3?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp4?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    invoiceNumber?: StringNullableFilter<"Quotation"> | string | null
    poDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    productType?: StringNullableFilter<"Quotation"> | string | null
    quotationDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    quotationNumber?: StringNullableFilter<"Quotation"> | string | null
    rejectReason?: StringNullableFilter<"Quotation"> | string | null
    remarks?: StringNullableFilter<"Quotation"> | string | null
    requirementDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    requirementNumber?: StringNullableFilter<"Quotation"> | string | null
    salesBranch?: StringNullableFilter<"Quotation"> | string | null
    salesTeamLeader?: StringNullableFilter<"Quotation"> | string | null
    salespersonId?: StringNullableFilter<"Quotation"> | string | null
    subject?: StringNullableFilter<"Quotation"> | string | null
    winLossReason?: StringNullableFilter<"Quotation"> | string | null
    company?: XOR<CompanyScalarRelationFilter, CompanyWhereInput>
    contact?: XOR<ContactNullableScalarRelationFilter, ContactWhereInput> | null
    salesperson?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type QuotationOrderByWithRelationInput = {
    id?: SortOrder
    companyId?: SortOrder
    status?: SortOrder
    salesBeforeVat?: SortOrderInput | SortOrder
    transportationFee?: SortOrderInput | SortOrder
    installationFee?: SortOrderInput | SortOrder
    totalAmountBeforeVat?: SortOrderInput | SortOrder
    actualClosingAmount?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    billingDate?: SortOrderInput | SortOrder
    contactId?: SortOrderInput | SortOrder
    followUp1?: SortOrderInput | SortOrder
    followUp2?: SortOrderInput | SortOrder
    followUp3?: SortOrderInput | SortOrder
    followUp4?: SortOrderInput | SortOrder
    invoiceNumber?: SortOrderInput | SortOrder
    poDate?: SortOrderInput | SortOrder
    productType?: SortOrderInput | SortOrder
    quotationDate?: SortOrderInput | SortOrder
    quotationNumber?: SortOrderInput | SortOrder
    rejectReason?: SortOrderInput | SortOrder
    remarks?: SortOrderInput | SortOrder
    requirementDate?: SortOrderInput | SortOrder
    requirementNumber?: SortOrderInput | SortOrder
    salesBranch?: SortOrderInput | SortOrder
    salesTeamLeader?: SortOrderInput | SortOrder
    salespersonId?: SortOrderInput | SortOrder
    subject?: SortOrderInput | SortOrder
    winLossReason?: SortOrderInput | SortOrder
    company?: CompanyOrderByWithRelationInput
    contact?: ContactOrderByWithRelationInput
    salesperson?: UserOrderByWithRelationInput
  }

  export type QuotationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: QuotationWhereInput | QuotationWhereInput[]
    OR?: QuotationWhereInput[]
    NOT?: QuotationWhereInput | QuotationWhereInput[]
    companyId?: StringFilter<"Quotation"> | string
    status?: StringFilter<"Quotation"> | string
    salesBeforeVat?: FloatNullableFilter<"Quotation"> | number | null
    transportationFee?: FloatNullableFilter<"Quotation"> | number | null
    installationFee?: FloatNullableFilter<"Quotation"> | number | null
    totalAmountBeforeVat?: FloatNullableFilter<"Quotation"> | number | null
    actualClosingAmount?: FloatNullableFilter<"Quotation"> | number | null
    createdAt?: DateTimeFilter<"Quotation"> | Date | string
    updatedAt?: DateTimeFilter<"Quotation"> | Date | string
    billingDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    contactId?: StringNullableFilter<"Quotation"> | string | null
    followUp1?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp2?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp3?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp4?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    invoiceNumber?: StringNullableFilter<"Quotation"> | string | null
    poDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    productType?: StringNullableFilter<"Quotation"> | string | null
    quotationDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    quotationNumber?: StringNullableFilter<"Quotation"> | string | null
    rejectReason?: StringNullableFilter<"Quotation"> | string | null
    remarks?: StringNullableFilter<"Quotation"> | string | null
    requirementDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    requirementNumber?: StringNullableFilter<"Quotation"> | string | null
    salesBranch?: StringNullableFilter<"Quotation"> | string | null
    salesTeamLeader?: StringNullableFilter<"Quotation"> | string | null
    salespersonId?: StringNullableFilter<"Quotation"> | string | null
    subject?: StringNullableFilter<"Quotation"> | string | null
    winLossReason?: StringNullableFilter<"Quotation"> | string | null
    company?: XOR<CompanyScalarRelationFilter, CompanyWhereInput>
    contact?: XOR<ContactNullableScalarRelationFilter, ContactWhereInput> | null
    salesperson?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type QuotationOrderByWithAggregationInput = {
    id?: SortOrder
    companyId?: SortOrder
    status?: SortOrder
    salesBeforeVat?: SortOrderInput | SortOrder
    transportationFee?: SortOrderInput | SortOrder
    installationFee?: SortOrderInput | SortOrder
    totalAmountBeforeVat?: SortOrderInput | SortOrder
    actualClosingAmount?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    billingDate?: SortOrderInput | SortOrder
    contactId?: SortOrderInput | SortOrder
    followUp1?: SortOrderInput | SortOrder
    followUp2?: SortOrderInput | SortOrder
    followUp3?: SortOrderInput | SortOrder
    followUp4?: SortOrderInput | SortOrder
    invoiceNumber?: SortOrderInput | SortOrder
    poDate?: SortOrderInput | SortOrder
    productType?: SortOrderInput | SortOrder
    quotationDate?: SortOrderInput | SortOrder
    quotationNumber?: SortOrderInput | SortOrder
    rejectReason?: SortOrderInput | SortOrder
    remarks?: SortOrderInput | SortOrder
    requirementDate?: SortOrderInput | SortOrder
    requirementNumber?: SortOrderInput | SortOrder
    salesBranch?: SortOrderInput | SortOrder
    salesTeamLeader?: SortOrderInput | SortOrder
    salespersonId?: SortOrderInput | SortOrder
    subject?: SortOrderInput | SortOrder
    winLossReason?: SortOrderInput | SortOrder
    _count?: QuotationCountOrderByAggregateInput
    _avg?: QuotationAvgOrderByAggregateInput
    _max?: QuotationMaxOrderByAggregateInput
    _min?: QuotationMinOrderByAggregateInput
    _sum?: QuotationSumOrderByAggregateInput
  }

  export type QuotationScalarWhereWithAggregatesInput = {
    AND?: QuotationScalarWhereWithAggregatesInput | QuotationScalarWhereWithAggregatesInput[]
    OR?: QuotationScalarWhereWithAggregatesInput[]
    NOT?: QuotationScalarWhereWithAggregatesInput | QuotationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Quotation"> | string
    companyId?: StringWithAggregatesFilter<"Quotation"> | string
    status?: StringWithAggregatesFilter<"Quotation"> | string
    salesBeforeVat?: FloatNullableWithAggregatesFilter<"Quotation"> | number | null
    transportationFee?: FloatNullableWithAggregatesFilter<"Quotation"> | number | null
    installationFee?: FloatNullableWithAggregatesFilter<"Quotation"> | number | null
    totalAmountBeforeVat?: FloatNullableWithAggregatesFilter<"Quotation"> | number | null
    actualClosingAmount?: FloatNullableWithAggregatesFilter<"Quotation"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"Quotation"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Quotation"> | Date | string
    billingDate?: DateTimeNullableWithAggregatesFilter<"Quotation"> | Date | string | null
    contactId?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    followUp1?: DateTimeNullableWithAggregatesFilter<"Quotation"> | Date | string | null
    followUp2?: DateTimeNullableWithAggregatesFilter<"Quotation"> | Date | string | null
    followUp3?: DateTimeNullableWithAggregatesFilter<"Quotation"> | Date | string | null
    followUp4?: DateTimeNullableWithAggregatesFilter<"Quotation"> | Date | string | null
    invoiceNumber?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    poDate?: DateTimeNullableWithAggregatesFilter<"Quotation"> | Date | string | null
    productType?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    quotationDate?: DateTimeNullableWithAggregatesFilter<"Quotation"> | Date | string | null
    quotationNumber?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    rejectReason?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    remarks?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    requirementDate?: DateTimeNullableWithAggregatesFilter<"Quotation"> | Date | string | null
    requirementNumber?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    salesBranch?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    salesTeamLeader?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    salespersonId?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    subject?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
    winLossReason?: StringNullableWithAggregatesFilter<"Quotation"> | string | null
  }

  export type TelesaleWhereInput = {
    AND?: TelesaleWhereInput | TelesaleWhereInput[]
    OR?: TelesaleWhereInput[]
    NOT?: TelesaleWhereInput | TelesaleWhereInput[]
    id?: StringFilter<"Telesale"> | string
    companyId?: StringFilter<"Telesale"> | string
    userId?: StringNullableFilter<"Telesale"> | string | null
    conversationSummary?: StringNullableFilter<"Telesale"> | string | null
    needsOrProblems?: StringNullableFilter<"Telesale"> | string | null
    meetingObjective?: StringNullableFilter<"Telesale"> | string | null
    competitorName?: StringNullableFilter<"Telesale"> | string | null
    competitorPrice?: FloatNullableFilter<"Telesale"> | number | null
    competitorPromotion?: StringNullableFilter<"Telesale"> | string | null
    lastMeetingDate?: DateTimeNullableFilter<"Telesale"> | Date | string | null
    result?: StringNullableFilter<"Telesale"> | string | null
    createdAt?: DateTimeFilter<"Telesale"> | Date | string
    updatedAt?: DateTimeFilter<"Telesale"> | Date | string
    callDate?: DateTimeNullableFilter<"Telesale"> | Date | string | null
    callOutcome?: StringNullableFilter<"Telesale"> | string | null
    callStatus?: StringNullableFilter<"Telesale"> | string | null
    forwardTo?: StringNullableFilter<"Telesale"> | string | null
    callbackAt?: DateTimeNullableFilter<"Telesale"> | Date | string | null
    company?: XOR<CompanyScalarRelationFilter, CompanyWhereInput>
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type TelesaleOrderByWithRelationInput = {
    id?: SortOrder
    companyId?: SortOrder
    userId?: SortOrderInput | SortOrder
    conversationSummary?: SortOrderInput | SortOrder
    needsOrProblems?: SortOrderInput | SortOrder
    meetingObjective?: SortOrderInput | SortOrder
    competitorName?: SortOrderInput | SortOrder
    competitorPrice?: SortOrderInput | SortOrder
    competitorPromotion?: SortOrderInput | SortOrder
    lastMeetingDate?: SortOrderInput | SortOrder
    result?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    callDate?: SortOrderInput | SortOrder
    callOutcome?: SortOrderInput | SortOrder
    callStatus?: SortOrderInput | SortOrder
    forwardTo?: SortOrderInput | SortOrder
    callbackAt?: SortOrderInput | SortOrder
    company?: CompanyOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
  }

  export type TelesaleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TelesaleWhereInput | TelesaleWhereInput[]
    OR?: TelesaleWhereInput[]
    NOT?: TelesaleWhereInput | TelesaleWhereInput[]
    companyId?: StringFilter<"Telesale"> | string
    userId?: StringNullableFilter<"Telesale"> | string | null
    conversationSummary?: StringNullableFilter<"Telesale"> | string | null
    needsOrProblems?: StringNullableFilter<"Telesale"> | string | null
    meetingObjective?: StringNullableFilter<"Telesale"> | string | null
    competitorName?: StringNullableFilter<"Telesale"> | string | null
    competitorPrice?: FloatNullableFilter<"Telesale"> | number | null
    competitorPromotion?: StringNullableFilter<"Telesale"> | string | null
    lastMeetingDate?: DateTimeNullableFilter<"Telesale"> | Date | string | null
    result?: StringNullableFilter<"Telesale"> | string | null
    createdAt?: DateTimeFilter<"Telesale"> | Date | string
    updatedAt?: DateTimeFilter<"Telesale"> | Date | string
    callDate?: DateTimeNullableFilter<"Telesale"> | Date | string | null
    callOutcome?: StringNullableFilter<"Telesale"> | string | null
    callStatus?: StringNullableFilter<"Telesale"> | string | null
    forwardTo?: StringNullableFilter<"Telesale"> | string | null
    callbackAt?: DateTimeNullableFilter<"Telesale"> | Date | string | null
    company?: XOR<CompanyScalarRelationFilter, CompanyWhereInput>
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type TelesaleOrderByWithAggregationInput = {
    id?: SortOrder
    companyId?: SortOrder
    userId?: SortOrderInput | SortOrder
    conversationSummary?: SortOrderInput | SortOrder
    needsOrProblems?: SortOrderInput | SortOrder
    meetingObjective?: SortOrderInput | SortOrder
    competitorName?: SortOrderInput | SortOrder
    competitorPrice?: SortOrderInput | SortOrder
    competitorPromotion?: SortOrderInput | SortOrder
    lastMeetingDate?: SortOrderInput | SortOrder
    result?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    callDate?: SortOrderInput | SortOrder
    callOutcome?: SortOrderInput | SortOrder
    callStatus?: SortOrderInput | SortOrder
    forwardTo?: SortOrderInput | SortOrder
    callbackAt?: SortOrderInput | SortOrder
    _count?: TelesaleCountOrderByAggregateInput
    _avg?: TelesaleAvgOrderByAggregateInput
    _max?: TelesaleMaxOrderByAggregateInput
    _min?: TelesaleMinOrderByAggregateInput
    _sum?: TelesaleSumOrderByAggregateInput
  }

  export type TelesaleScalarWhereWithAggregatesInput = {
    AND?: TelesaleScalarWhereWithAggregatesInput | TelesaleScalarWhereWithAggregatesInput[]
    OR?: TelesaleScalarWhereWithAggregatesInput[]
    NOT?: TelesaleScalarWhereWithAggregatesInput | TelesaleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Telesale"> | string
    companyId?: StringWithAggregatesFilter<"Telesale"> | string
    userId?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    conversationSummary?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    needsOrProblems?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    meetingObjective?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    competitorName?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    competitorPrice?: FloatNullableWithAggregatesFilter<"Telesale"> | number | null
    competitorPromotion?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    lastMeetingDate?: DateTimeNullableWithAggregatesFilter<"Telesale"> | Date | string | null
    result?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Telesale"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Telesale"> | Date | string
    callDate?: DateTimeNullableWithAggregatesFilter<"Telesale"> | Date | string | null
    callOutcome?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    callStatus?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    forwardTo?: StringNullableWithAggregatesFilter<"Telesale"> | string | null
    callbackAt?: DateTimeNullableWithAggregatesFilter<"Telesale"> | Date | string | null
  }

  export type BusinessTypeWhereInput = {
    AND?: BusinessTypeWhereInput | BusinessTypeWhereInput[]
    OR?: BusinessTypeWhereInput[]
    NOT?: BusinessTypeWhereInput | BusinessTypeWhereInput[]
    id?: StringFilter<"BusinessType"> | string
    name?: StringFilter<"BusinessType"> | string
    createdAt?: DateTimeFilter<"BusinessType"> | Date | string
    updatedAt?: DateTimeFilter<"BusinessType"> | Date | string
  }

  export type BusinessTypeOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BusinessTypeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    name?: string
    AND?: BusinessTypeWhereInput | BusinessTypeWhereInput[]
    OR?: BusinessTypeWhereInput[]
    NOT?: BusinessTypeWhereInput | BusinessTypeWhereInput[]
    createdAt?: DateTimeFilter<"BusinessType"> | Date | string
    updatedAt?: DateTimeFilter<"BusinessType"> | Date | string
  }, "id" | "name">

  export type BusinessTypeOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: BusinessTypeCountOrderByAggregateInput
    _max?: BusinessTypeMaxOrderByAggregateInput
    _min?: BusinessTypeMinOrderByAggregateInput
  }

  export type BusinessTypeScalarWhereWithAggregatesInput = {
    AND?: BusinessTypeScalarWhereWithAggregatesInput | BusinessTypeScalarWhereWithAggregatesInput[]
    OR?: BusinessTypeScalarWhereWithAggregatesInput[]
    NOT?: BusinessTypeScalarWhereWithAggregatesInput | BusinessTypeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"BusinessType"> | string
    name?: StringWithAggregatesFilter<"BusinessType"> | string
    createdAt?: DateTimeWithAggregatesFilter<"BusinessType"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"BusinessType"> | Date | string
  }

  export type PostalDataWhereInput = {
    AND?: PostalDataWhereInput | PostalDataWhereInput[]
    OR?: PostalDataWhereInput[]
    NOT?: PostalDataWhereInput | PostalDataWhereInput[]
    id?: StringFilter<"PostalData"> | string
    postalCode?: StringFilter<"PostalData"> | string
    subDistrict?: StringFilter<"PostalData"> | string
    district?: StringFilter<"PostalData"> | string
    province?: StringFilter<"PostalData"> | string
    createdAt?: DateTimeFilter<"PostalData"> | Date | string
    updatedAt?: DateTimeFilter<"PostalData"> | Date | string
  }

  export type PostalDataOrderByWithRelationInput = {
    id?: SortOrder
    postalCode?: SortOrder
    subDistrict?: SortOrder
    district?: SortOrder
    province?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PostalDataWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PostalDataWhereInput | PostalDataWhereInput[]
    OR?: PostalDataWhereInput[]
    NOT?: PostalDataWhereInput | PostalDataWhereInput[]
    postalCode?: StringFilter<"PostalData"> | string
    subDistrict?: StringFilter<"PostalData"> | string
    district?: StringFilter<"PostalData"> | string
    province?: StringFilter<"PostalData"> | string
    createdAt?: DateTimeFilter<"PostalData"> | Date | string
    updatedAt?: DateTimeFilter<"PostalData"> | Date | string
  }, "id">

  export type PostalDataOrderByWithAggregationInput = {
    id?: SortOrder
    postalCode?: SortOrder
    subDistrict?: SortOrder
    district?: SortOrder
    province?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: PostalDataCountOrderByAggregateInput
    _max?: PostalDataMaxOrderByAggregateInput
    _min?: PostalDataMinOrderByAggregateInput
  }

  export type PostalDataScalarWhereWithAggregatesInput = {
    AND?: PostalDataScalarWhereWithAggregatesInput | PostalDataScalarWhereWithAggregatesInput[]
    OR?: PostalDataScalarWhereWithAggregatesInput[]
    NOT?: PostalDataScalarWhereWithAggregatesInput | PostalDataScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PostalData"> | string
    postalCode?: StringWithAggregatesFilter<"PostalData"> | string
    subDistrict?: StringWithAggregatesFilter<"PostalData"> | string
    district?: StringWithAggregatesFilter<"PostalData"> | string
    province?: StringWithAggregatesFilter<"PostalData"> | string
    createdAt?: DateTimeWithAggregatesFilter<"PostalData"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"PostalData"> | Date | string
  }

  export type CompetitorWhereInput = {
    AND?: CompetitorWhereInput | CompetitorWhereInput[]
    OR?: CompetitorWhereInput[]
    NOT?: CompetitorWhereInput | CompetitorWhereInput[]
    id?: StringFilter<"Competitor"> | string
    name?: StringFilter<"Competitor"> | string
    price?: FloatNullableFilter<"Competitor"> | number | null
    promotion?: StringNullableFilter<"Competitor"> | string | null
    createdAt?: DateTimeFilter<"Competitor"> | Date | string
    updatedAt?: DateTimeFilter<"Competitor"> | Date | string
  }

  export type CompetitorOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    price?: SortOrderInput | SortOrder
    promotion?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CompetitorWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    name?: string
    AND?: CompetitorWhereInput | CompetitorWhereInput[]
    OR?: CompetitorWhereInput[]
    NOT?: CompetitorWhereInput | CompetitorWhereInput[]
    price?: FloatNullableFilter<"Competitor"> | number | null
    promotion?: StringNullableFilter<"Competitor"> | string | null
    createdAt?: DateTimeFilter<"Competitor"> | Date | string
    updatedAt?: DateTimeFilter<"Competitor"> | Date | string
  }, "id" | "name">

  export type CompetitorOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    price?: SortOrderInput | SortOrder
    promotion?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CompetitorCountOrderByAggregateInput
    _avg?: CompetitorAvgOrderByAggregateInput
    _max?: CompetitorMaxOrderByAggregateInput
    _min?: CompetitorMinOrderByAggregateInput
    _sum?: CompetitorSumOrderByAggregateInput
  }

  export type CompetitorScalarWhereWithAggregatesInput = {
    AND?: CompetitorScalarWhereWithAggregatesInput | CompetitorScalarWhereWithAggregatesInput[]
    OR?: CompetitorScalarWhereWithAggregatesInput[]
    NOT?: CompetitorScalarWhereWithAggregatesInput | CompetitorScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Competitor"> | string
    name?: StringWithAggregatesFilter<"Competitor"> | string
    price?: FloatNullableWithAggregatesFilter<"Competitor"> | number | null
    promotion?: StringNullableWithAggregatesFilter<"Competitor"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Competitor"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Competitor"> | Date | string
  }

  export type UserCreateInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleCreateNestedManyWithoutUserInput
    telesales?: TelesaleCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyCreateNestedManyWithoutAssignedUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationUncheckedCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutUserInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleUncheckedCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetUncheckedCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyUncheckedCreateNestedManyWithoutAssignedUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUpdateManyWithoutAssignedUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUncheckedUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUncheckedUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUncheckedUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUncheckedUpdateManyWithoutAssignedUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
  }

  export type MonthlyTargetCreateInput = {
    id?: string
    month: number
    year: number
    amount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    user?: UserCreateNestedOneWithoutMonthlyTargetsInput
  }

  export type MonthlyTargetUncheckedCreateInput = {
    id?: string
    userId?: string | null
    month: number
    year: number
    amount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MonthlyTargetUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    month?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    amount?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneWithoutMonthlyTargetsNestedInput
  }

  export type MonthlyTargetUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    month?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    amount?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MonthlyTargetCreateManyInput = {
    id?: string
    userId?: string | null
    month: number
    year: number
    amount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MonthlyTargetUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    month?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    amount?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MonthlyTargetUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    month?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    amount?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScheduleCreateInput = {
    id?: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSchedulesInput
    company?: CompanyCreateNestedOneWithoutSchedulesInput
  }

  export type ScheduleUncheckedCreateInput = {
    id?: string
    userId: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    companyId?: string | null
  }

  export type ScheduleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSchedulesNestedInput
    company?: CompanyUpdateOneWithoutSchedulesNestedInput
  }

  export type ScheduleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    companyId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ScheduleCreateManyInput = {
    id?: string
    userId: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    companyId?: string | null
  }

  export type ScheduleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScheduleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    companyId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type EmployeeSaleCreateInput = {
    id?: string
    employeeId?: string | null
    fullName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    nickname?: string | null
    branch?: string | null
    teamLeader?: string | null
    position?: string | null
    department?: string | null
    startDate?: Date | string | null
    user?: UserCreateNestedOneWithoutEmployeeSaleInput
  }

  export type EmployeeSaleUncheckedCreateInput = {
    id?: string
    userId?: string | null
    employeeId?: string | null
    fullName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    nickname?: string | null
    branch?: string | null
    teamLeader?: string | null
    position?: string | null
    department?: string | null
    startDate?: Date | string | null
  }

  export type EmployeeSaleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    branch?: NullableStringFieldUpdateOperationsInput | string | null
    teamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    position?: NullableStringFieldUpdateOperationsInput | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneWithoutEmployeeSaleNestedInput
  }

  export type EmployeeSaleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    branch?: NullableStringFieldUpdateOperationsInput | string | null
    teamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    position?: NullableStringFieldUpdateOperationsInput | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type EmployeeSaleCreateManyInput = {
    id?: string
    userId?: string | null
    employeeId?: string | null
    fullName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    nickname?: string | null
    branch?: string | null
    teamLeader?: string | null
    position?: string | null
    department?: string | null
    startDate?: Date | string | null
  }

  export type EmployeeSaleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    branch?: NullableStringFieldUpdateOperationsInput | string | null
    teamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    position?: NullableStringFieldUpdateOperationsInput | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type EmployeeSaleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    branch?: NullableStringFieldUpdateOperationsInput | string | null
    teamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    position?: NullableStringFieldUpdateOperationsInput | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CompanyCreateInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    contacts?: ContactCreateNestedManyWithoutCompanyInput
    quotations?: QuotationCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleCreateNestedManyWithoutCompanyInput
    assignedUser?: UserCreateNestedOneWithoutAssignedCompaniesInput
  }

  export type CompanyUncheckedCreateInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    assignedUserId?: string | null
    contacts?: ContactUncheckedCreateNestedManyWithoutCompanyInput
    quotations?: QuotationUncheckedCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutCompanyInput
  }

  export type CompanyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUpdateManyWithoutCompanyNestedInput
    quotations?: QuotationUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUpdateManyWithoutCompanyNestedInput
    assignedUser?: UserUpdateOneWithoutAssignedCompaniesNestedInput
  }

  export type CompanyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    assignedUserId?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUncheckedUpdateManyWithoutCompanyNestedInput
    quotations?: QuotationUncheckedUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutCompanyNestedInput
  }

  export type CompanyCreateManyInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    assignedUserId?: string | null
  }

  export type CompanyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type CompanyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    assignedUserId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ContactCreateInput = {
    id?: string
    contactName: string
    position?: string | null
    mobilePhone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    company: CompanyCreateNestedOneWithoutContactsInput
    quotations?: QuotationCreateNestedManyWithoutContactInput
  }

  export type ContactUncheckedCreateInput = {
    id?: string
    companyId: string
    contactName: string
    position?: string | null
    mobilePhone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    quotations?: QuotationUncheckedCreateNestedManyWithoutContactInput
  }

  export type ContactUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    company?: CompanyUpdateOneRequiredWithoutContactsNestedInput
    quotations?: QuotationUpdateManyWithoutContactNestedInput
  }

  export type ContactUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    quotations?: QuotationUncheckedUpdateManyWithoutContactNestedInput
  }

  export type ContactCreateManyInput = {
    id?: string
    companyId: string
    contactName: string
    position?: string | null
    mobilePhone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ContactUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContactUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type QuotationCreateInput = {
    id?: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    subject?: string | null
    winLossReason?: string | null
    company: CompanyCreateNestedOneWithoutQuotationsInput
    contact?: ContactCreateNestedOneWithoutQuotationsInput
    salesperson?: UserCreateNestedOneWithoutQuotationsInput
  }

  export type QuotationUncheckedCreateInput = {
    id?: string
    companyId: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    contactId?: string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    salespersonId?: string | null
    subject?: string | null
    winLossReason?: string | null
  }

  export type QuotationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
    company?: CompanyUpdateOneRequiredWithoutQuotationsNestedInput
    contact?: ContactUpdateOneWithoutQuotationsNestedInput
    salesperson?: UserUpdateOneWithoutQuotationsNestedInput
  }

  export type QuotationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    contactId?: NullableStringFieldUpdateOperationsInput | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    salespersonId?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type QuotationCreateManyInput = {
    id?: string
    companyId: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    contactId?: string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    salespersonId?: string | null
    subject?: string | null
    winLossReason?: string | null
  }

  export type QuotationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type QuotationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    contactId?: NullableStringFieldUpdateOperationsInput | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    salespersonId?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TelesaleCreateInput = {
    id?: string
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
    company: CompanyCreateNestedOneWithoutTelesalesInput
    user?: UserCreateNestedOneWithoutTelesalesInput
  }

  export type TelesaleUncheckedCreateInput = {
    id?: string
    companyId: string
    userId?: string | null
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
  }

  export type TelesaleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    company?: CompanyUpdateOneRequiredWithoutTelesalesNestedInput
    user?: UserUpdateOneWithoutTelesalesNestedInput
  }

  export type TelesaleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TelesaleCreateManyInput = {
    id?: string
    companyId: string
    userId?: string | null
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
  }

  export type TelesaleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TelesaleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type BusinessTypeCreateInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BusinessTypeUncheckedCreateInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BusinessTypeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BusinessTypeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BusinessTypeCreateManyInput = {
    id?: string
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type BusinessTypeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BusinessTypeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PostalDataCreateInput = {
    id?: string
    postalCode: string
    subDistrict: string
    district: string
    province: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PostalDataUncheckedCreateInput = {
    id?: string
    postalCode: string
    subDistrict: string
    district: string
    province: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PostalDataUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    subDistrict?: StringFieldUpdateOperationsInput | string
    district?: StringFieldUpdateOperationsInput | string
    province?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PostalDataUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    subDistrict?: StringFieldUpdateOperationsInput | string
    district?: StringFieldUpdateOperationsInput | string
    province?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PostalDataCreateManyInput = {
    id?: string
    postalCode: string
    subDistrict: string
    district: string
    province: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PostalDataUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    subDistrict?: StringFieldUpdateOperationsInput | string
    district?: StringFieldUpdateOperationsInput | string
    province?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PostalDataUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    subDistrict?: StringFieldUpdateOperationsInput | string
    district?: StringFieldUpdateOperationsInput | string
    province?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CompetitorCreateInput = {
    id?: string
    name: string
    price?: number | null
    promotion?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CompetitorUncheckedCreateInput = {
    id?: string
    name: string
    price?: number | null
    promotion?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CompetitorUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    promotion?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CompetitorUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    promotion?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CompetitorCreateManyInput = {
    id?: string
    name: string
    price?: number | null
    promotion?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CompetitorUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    promotion?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CompetitorUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    price?: NullableFloatFieldUpdateOperationsInput | number | null
    promotion?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type QuotationListRelationFilter = {
    every?: QuotationWhereInput
    some?: QuotationWhereInput
    none?: QuotationWhereInput
  }

  export type ScheduleListRelationFilter = {
    every?: ScheduleWhereInput
    some?: ScheduleWhereInput
    none?: ScheduleWhereInput
  }

  export type TelesaleListRelationFilter = {
    every?: TelesaleWhereInput
    some?: TelesaleWhereInput
    none?: TelesaleWhereInput
  }

  export type EmployeeSaleNullableScalarRelationFilter = {
    is?: EmployeeSaleWhereInput | null
    isNot?: EmployeeSaleWhereInput | null
  }

  export type MonthlyTargetListRelationFilter = {
    every?: MonthlyTargetWhereInput
    some?: MonthlyTargetWhereInput
    none?: MonthlyTargetWhereInput
  }

  export type CompanyListRelationFilter = {
    every?: CompanyWhereInput
    some?: CompanyWhereInput
    none?: CompanyWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type QuotationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ScheduleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TelesaleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type MonthlyTargetOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CompanyOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    email?: SortOrder
    fullName?: SortOrder
    phoneNumber?: SortOrder
    role?: SortOrder
    position?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    otpCode?: SortOrder
    otpExpiresAt?: SortOrder
    isActive?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    email?: SortOrder
    fullName?: SortOrder
    phoneNumber?: SortOrder
    role?: SortOrder
    position?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    otpCode?: SortOrder
    otpExpiresAt?: SortOrder
    isActive?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    employeeId?: SortOrder
    email?: SortOrder
    fullName?: SortOrder
    phoneNumber?: SortOrder
    role?: SortOrder
    position?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    otpCode?: SortOrder
    otpExpiresAt?: SortOrder
    isActive?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type MonthlyTargetUserIdMonthYearCompoundUniqueInput = {
    userId: string
    month: number
    year: number
  }

  export type MonthlyTargetCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    month?: SortOrder
    year?: SortOrder
    amount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MonthlyTargetAvgOrderByAggregateInput = {
    month?: SortOrder
    year?: SortOrder
    amount?: SortOrder
  }

  export type MonthlyTargetMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    month?: SortOrder
    year?: SortOrder
    amount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MonthlyTargetMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    month?: SortOrder
    year?: SortOrder
    amount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MonthlyTargetSumOrderByAggregateInput = {
    month?: SortOrder
    year?: SortOrder
    amount?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type CompanyNullableScalarRelationFilter = {
    is?: CompanyWhereInput | null
    isNot?: CompanyWhereInput | null
  }

  export type ScheduleCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    date?: SortOrder
    status?: SortOrder
    presentationStatus?: SortOrder
    quotationNumber?: SortOrder
    poNumber?: SortOrder
    invoiceNumber?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyId?: SortOrder
  }

  export type ScheduleMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    date?: SortOrder
    status?: SortOrder
    presentationStatus?: SortOrder
    quotationNumber?: SortOrder
    poNumber?: SortOrder
    invoiceNumber?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyId?: SortOrder
  }

  export type ScheduleMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    date?: SortOrder
    status?: SortOrder
    presentationStatus?: SortOrder
    quotationNumber?: SortOrder
    poNumber?: SortOrder
    invoiceNumber?: SortOrder
    notes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyId?: SortOrder
  }

  export type EmployeeSaleCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    employeeId?: SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    nickname?: SortOrder
    branch?: SortOrder
    teamLeader?: SortOrder
    position?: SortOrder
    department?: SortOrder
    startDate?: SortOrder
  }

  export type EmployeeSaleMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    employeeId?: SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    nickname?: SortOrder
    branch?: SortOrder
    teamLeader?: SortOrder
    position?: SortOrder
    department?: SortOrder
    startDate?: SortOrder
  }

  export type EmployeeSaleMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    employeeId?: SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    nickname?: SortOrder
    branch?: SortOrder
    teamLeader?: SortOrder
    position?: SortOrder
    department?: SortOrder
    startDate?: SortOrder
  }

  export type ContactListRelationFilter = {
    every?: ContactWhereInput
    some?: ContactWhereInput
    none?: ContactWhereInput
  }

  export type ContactOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CompanyCountOrderByAggregateInput = {
    id?: SortOrder
    companyName?: SortOrder
    taxId?: SortOrder
    address?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    area?: SortOrder
    branchOrHeadOffice?: SortOrder
    businessType?: SortOrder
    customerAccessChannel?: SortOrder
    customerStatus?: SortOrder
    customerType?: SortOrder
    district?: SortOrder
    postalCode?: SortOrder
    province?: SortOrder
    subDistrict?: SortOrder
    assignedUserId?: SortOrder
  }

  export type CompanyMaxOrderByAggregateInput = {
    id?: SortOrder
    companyName?: SortOrder
    taxId?: SortOrder
    address?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    area?: SortOrder
    branchOrHeadOffice?: SortOrder
    businessType?: SortOrder
    customerAccessChannel?: SortOrder
    customerStatus?: SortOrder
    customerType?: SortOrder
    district?: SortOrder
    postalCode?: SortOrder
    province?: SortOrder
    subDistrict?: SortOrder
    assignedUserId?: SortOrder
  }

  export type CompanyMinOrderByAggregateInput = {
    id?: SortOrder
    companyName?: SortOrder
    taxId?: SortOrder
    address?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    area?: SortOrder
    branchOrHeadOffice?: SortOrder
    businessType?: SortOrder
    customerAccessChannel?: SortOrder
    customerStatus?: SortOrder
    customerType?: SortOrder
    district?: SortOrder
    postalCode?: SortOrder
    province?: SortOrder
    subDistrict?: SortOrder
    assignedUserId?: SortOrder
  }

  export type CompanyScalarRelationFilter = {
    is?: CompanyWhereInput
    isNot?: CompanyWhereInput
  }

  export type ContactCountOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    contactName?: SortOrder
    position?: SortOrder
    mobilePhone?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ContactMaxOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    contactName?: SortOrder
    position?: SortOrder
    mobilePhone?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ContactMinOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    contactName?: SortOrder
    position?: SortOrder
    mobilePhone?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type ContactNullableScalarRelationFilter = {
    is?: ContactWhereInput | null
    isNot?: ContactWhereInput | null
  }

  export type QuotationCountOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    status?: SortOrder
    salesBeforeVat?: SortOrder
    transportationFee?: SortOrder
    installationFee?: SortOrder
    totalAmountBeforeVat?: SortOrder
    actualClosingAmount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    billingDate?: SortOrder
    contactId?: SortOrder
    followUp1?: SortOrder
    followUp2?: SortOrder
    followUp3?: SortOrder
    followUp4?: SortOrder
    invoiceNumber?: SortOrder
    poDate?: SortOrder
    productType?: SortOrder
    quotationDate?: SortOrder
    quotationNumber?: SortOrder
    rejectReason?: SortOrder
    remarks?: SortOrder
    requirementDate?: SortOrder
    requirementNumber?: SortOrder
    salesBranch?: SortOrder
    salesTeamLeader?: SortOrder
    salespersonId?: SortOrder
    subject?: SortOrder
    winLossReason?: SortOrder
  }

  export type QuotationAvgOrderByAggregateInput = {
    salesBeforeVat?: SortOrder
    transportationFee?: SortOrder
    installationFee?: SortOrder
    totalAmountBeforeVat?: SortOrder
    actualClosingAmount?: SortOrder
  }

  export type QuotationMaxOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    status?: SortOrder
    salesBeforeVat?: SortOrder
    transportationFee?: SortOrder
    installationFee?: SortOrder
    totalAmountBeforeVat?: SortOrder
    actualClosingAmount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    billingDate?: SortOrder
    contactId?: SortOrder
    followUp1?: SortOrder
    followUp2?: SortOrder
    followUp3?: SortOrder
    followUp4?: SortOrder
    invoiceNumber?: SortOrder
    poDate?: SortOrder
    productType?: SortOrder
    quotationDate?: SortOrder
    quotationNumber?: SortOrder
    rejectReason?: SortOrder
    remarks?: SortOrder
    requirementDate?: SortOrder
    requirementNumber?: SortOrder
    salesBranch?: SortOrder
    salesTeamLeader?: SortOrder
    salespersonId?: SortOrder
    subject?: SortOrder
    winLossReason?: SortOrder
  }

  export type QuotationMinOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    status?: SortOrder
    salesBeforeVat?: SortOrder
    transportationFee?: SortOrder
    installationFee?: SortOrder
    totalAmountBeforeVat?: SortOrder
    actualClosingAmount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    billingDate?: SortOrder
    contactId?: SortOrder
    followUp1?: SortOrder
    followUp2?: SortOrder
    followUp3?: SortOrder
    followUp4?: SortOrder
    invoiceNumber?: SortOrder
    poDate?: SortOrder
    productType?: SortOrder
    quotationDate?: SortOrder
    quotationNumber?: SortOrder
    rejectReason?: SortOrder
    remarks?: SortOrder
    requirementDate?: SortOrder
    requirementNumber?: SortOrder
    salesBranch?: SortOrder
    salesTeamLeader?: SortOrder
    salespersonId?: SortOrder
    subject?: SortOrder
    winLossReason?: SortOrder
  }

  export type QuotationSumOrderByAggregateInput = {
    salesBeforeVat?: SortOrder
    transportationFee?: SortOrder
    installationFee?: SortOrder
    totalAmountBeforeVat?: SortOrder
    actualClosingAmount?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type TelesaleCountOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    userId?: SortOrder
    conversationSummary?: SortOrder
    needsOrProblems?: SortOrder
    meetingObjective?: SortOrder
    competitorName?: SortOrder
    competitorPrice?: SortOrder
    competitorPromotion?: SortOrder
    lastMeetingDate?: SortOrder
    result?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    callDate?: SortOrder
    callOutcome?: SortOrder
    callStatus?: SortOrder
    forwardTo?: SortOrder
    callbackAt?: SortOrder
  }

  export type TelesaleAvgOrderByAggregateInput = {
    competitorPrice?: SortOrder
  }

  export type TelesaleMaxOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    userId?: SortOrder
    conversationSummary?: SortOrder
    needsOrProblems?: SortOrder
    meetingObjective?: SortOrder
    competitorName?: SortOrder
    competitorPrice?: SortOrder
    competitorPromotion?: SortOrder
    lastMeetingDate?: SortOrder
    result?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    callDate?: SortOrder
    callOutcome?: SortOrder
    callStatus?: SortOrder
    forwardTo?: SortOrder
    callbackAt?: SortOrder
  }

  export type TelesaleMinOrderByAggregateInput = {
    id?: SortOrder
    companyId?: SortOrder
    userId?: SortOrder
    conversationSummary?: SortOrder
    needsOrProblems?: SortOrder
    meetingObjective?: SortOrder
    competitorName?: SortOrder
    competitorPrice?: SortOrder
    competitorPromotion?: SortOrder
    lastMeetingDate?: SortOrder
    result?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    callDate?: SortOrder
    callOutcome?: SortOrder
    callStatus?: SortOrder
    forwardTo?: SortOrder
    callbackAt?: SortOrder
  }

  export type TelesaleSumOrderByAggregateInput = {
    competitorPrice?: SortOrder
  }

  export type BusinessTypeCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BusinessTypeMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type BusinessTypeMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PostalDataCountOrderByAggregateInput = {
    id?: SortOrder
    postalCode?: SortOrder
    subDistrict?: SortOrder
    district?: SortOrder
    province?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PostalDataMaxOrderByAggregateInput = {
    id?: SortOrder
    postalCode?: SortOrder
    subDistrict?: SortOrder
    district?: SortOrder
    province?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type PostalDataMinOrderByAggregateInput = {
    id?: SortOrder
    postalCode?: SortOrder
    subDistrict?: SortOrder
    district?: SortOrder
    province?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CompetitorCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    price?: SortOrder
    promotion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CompetitorAvgOrderByAggregateInput = {
    price?: SortOrder
  }

  export type CompetitorMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    price?: SortOrder
    promotion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CompetitorMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    price?: SortOrder
    promotion?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CompetitorSumOrderByAggregateInput = {
    price?: SortOrder
  }

  export type QuotationCreateNestedManyWithoutSalespersonInput = {
    create?: XOR<QuotationCreateWithoutSalespersonInput, QuotationUncheckedCreateWithoutSalespersonInput> | QuotationCreateWithoutSalespersonInput[] | QuotationUncheckedCreateWithoutSalespersonInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutSalespersonInput | QuotationCreateOrConnectWithoutSalespersonInput[]
    createMany?: QuotationCreateManySalespersonInputEnvelope
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
  }

  export type ScheduleCreateNestedManyWithoutUserInput = {
    create?: XOR<ScheduleCreateWithoutUserInput, ScheduleUncheckedCreateWithoutUserInput> | ScheduleCreateWithoutUserInput[] | ScheduleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ScheduleCreateOrConnectWithoutUserInput | ScheduleCreateOrConnectWithoutUserInput[]
    createMany?: ScheduleCreateManyUserInputEnvelope
    connect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
  }

  export type TelesaleCreateNestedManyWithoutUserInput = {
    create?: XOR<TelesaleCreateWithoutUserInput, TelesaleUncheckedCreateWithoutUserInput> | TelesaleCreateWithoutUserInput[] | TelesaleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TelesaleCreateOrConnectWithoutUserInput | TelesaleCreateOrConnectWithoutUserInput[]
    createMany?: TelesaleCreateManyUserInputEnvelope
    connect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
  }

  export type EmployeeSaleCreateNestedOneWithoutUserInput = {
    create?: XOR<EmployeeSaleCreateWithoutUserInput, EmployeeSaleUncheckedCreateWithoutUserInput>
    connectOrCreate?: EmployeeSaleCreateOrConnectWithoutUserInput
    connect?: EmployeeSaleWhereUniqueInput
  }

  export type MonthlyTargetCreateNestedManyWithoutUserInput = {
    create?: XOR<MonthlyTargetCreateWithoutUserInput, MonthlyTargetUncheckedCreateWithoutUserInput> | MonthlyTargetCreateWithoutUserInput[] | MonthlyTargetUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MonthlyTargetCreateOrConnectWithoutUserInput | MonthlyTargetCreateOrConnectWithoutUserInput[]
    createMany?: MonthlyTargetCreateManyUserInputEnvelope
    connect?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
  }

  export type CompanyCreateNestedManyWithoutAssignedUserInput = {
    create?: XOR<CompanyCreateWithoutAssignedUserInput, CompanyUncheckedCreateWithoutAssignedUserInput> | CompanyCreateWithoutAssignedUserInput[] | CompanyUncheckedCreateWithoutAssignedUserInput[]
    connectOrCreate?: CompanyCreateOrConnectWithoutAssignedUserInput | CompanyCreateOrConnectWithoutAssignedUserInput[]
    createMany?: CompanyCreateManyAssignedUserInputEnvelope
    connect?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
  }

  export type QuotationUncheckedCreateNestedManyWithoutSalespersonInput = {
    create?: XOR<QuotationCreateWithoutSalespersonInput, QuotationUncheckedCreateWithoutSalespersonInput> | QuotationCreateWithoutSalespersonInput[] | QuotationUncheckedCreateWithoutSalespersonInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutSalespersonInput | QuotationCreateOrConnectWithoutSalespersonInput[]
    createMany?: QuotationCreateManySalespersonInputEnvelope
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
  }

  export type ScheduleUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ScheduleCreateWithoutUserInput, ScheduleUncheckedCreateWithoutUserInput> | ScheduleCreateWithoutUserInput[] | ScheduleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ScheduleCreateOrConnectWithoutUserInput | ScheduleCreateOrConnectWithoutUserInput[]
    createMany?: ScheduleCreateManyUserInputEnvelope
    connect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
  }

  export type TelesaleUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TelesaleCreateWithoutUserInput, TelesaleUncheckedCreateWithoutUserInput> | TelesaleCreateWithoutUserInput[] | TelesaleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TelesaleCreateOrConnectWithoutUserInput | TelesaleCreateOrConnectWithoutUserInput[]
    createMany?: TelesaleCreateManyUserInputEnvelope
    connect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
  }

  export type EmployeeSaleUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<EmployeeSaleCreateWithoutUserInput, EmployeeSaleUncheckedCreateWithoutUserInput>
    connectOrCreate?: EmployeeSaleCreateOrConnectWithoutUserInput
    connect?: EmployeeSaleWhereUniqueInput
  }

  export type MonthlyTargetUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<MonthlyTargetCreateWithoutUserInput, MonthlyTargetUncheckedCreateWithoutUserInput> | MonthlyTargetCreateWithoutUserInput[] | MonthlyTargetUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MonthlyTargetCreateOrConnectWithoutUserInput | MonthlyTargetCreateOrConnectWithoutUserInput[]
    createMany?: MonthlyTargetCreateManyUserInputEnvelope
    connect?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
  }

  export type CompanyUncheckedCreateNestedManyWithoutAssignedUserInput = {
    create?: XOR<CompanyCreateWithoutAssignedUserInput, CompanyUncheckedCreateWithoutAssignedUserInput> | CompanyCreateWithoutAssignedUserInput[] | CompanyUncheckedCreateWithoutAssignedUserInput[]
    connectOrCreate?: CompanyCreateOrConnectWithoutAssignedUserInput | CompanyCreateOrConnectWithoutAssignedUserInput[]
    createMany?: CompanyCreateManyAssignedUserInputEnvelope
    connect?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type QuotationUpdateManyWithoutSalespersonNestedInput = {
    create?: XOR<QuotationCreateWithoutSalespersonInput, QuotationUncheckedCreateWithoutSalespersonInput> | QuotationCreateWithoutSalespersonInput[] | QuotationUncheckedCreateWithoutSalespersonInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutSalespersonInput | QuotationCreateOrConnectWithoutSalespersonInput[]
    upsert?: QuotationUpsertWithWhereUniqueWithoutSalespersonInput | QuotationUpsertWithWhereUniqueWithoutSalespersonInput[]
    createMany?: QuotationCreateManySalespersonInputEnvelope
    set?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    disconnect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    delete?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    update?: QuotationUpdateWithWhereUniqueWithoutSalespersonInput | QuotationUpdateWithWhereUniqueWithoutSalespersonInput[]
    updateMany?: QuotationUpdateManyWithWhereWithoutSalespersonInput | QuotationUpdateManyWithWhereWithoutSalespersonInput[]
    deleteMany?: QuotationScalarWhereInput | QuotationScalarWhereInput[]
  }

  export type ScheduleUpdateManyWithoutUserNestedInput = {
    create?: XOR<ScheduleCreateWithoutUserInput, ScheduleUncheckedCreateWithoutUserInput> | ScheduleCreateWithoutUserInput[] | ScheduleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ScheduleCreateOrConnectWithoutUserInput | ScheduleCreateOrConnectWithoutUserInput[]
    upsert?: ScheduleUpsertWithWhereUniqueWithoutUserInput | ScheduleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ScheduleCreateManyUserInputEnvelope
    set?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    disconnect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    delete?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    connect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    update?: ScheduleUpdateWithWhereUniqueWithoutUserInput | ScheduleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ScheduleUpdateManyWithWhereWithoutUserInput | ScheduleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ScheduleScalarWhereInput | ScheduleScalarWhereInput[]
  }

  export type TelesaleUpdateManyWithoutUserNestedInput = {
    create?: XOR<TelesaleCreateWithoutUserInput, TelesaleUncheckedCreateWithoutUserInput> | TelesaleCreateWithoutUserInput[] | TelesaleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TelesaleCreateOrConnectWithoutUserInput | TelesaleCreateOrConnectWithoutUserInput[]
    upsert?: TelesaleUpsertWithWhereUniqueWithoutUserInput | TelesaleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TelesaleCreateManyUserInputEnvelope
    set?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    disconnect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    delete?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    connect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    update?: TelesaleUpdateWithWhereUniqueWithoutUserInput | TelesaleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TelesaleUpdateManyWithWhereWithoutUserInput | TelesaleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TelesaleScalarWhereInput | TelesaleScalarWhereInput[]
  }

  export type EmployeeSaleUpdateOneWithoutUserNestedInput = {
    create?: XOR<EmployeeSaleCreateWithoutUserInput, EmployeeSaleUncheckedCreateWithoutUserInput>
    connectOrCreate?: EmployeeSaleCreateOrConnectWithoutUserInput
    upsert?: EmployeeSaleUpsertWithoutUserInput
    disconnect?: EmployeeSaleWhereInput | boolean
    delete?: EmployeeSaleWhereInput | boolean
    connect?: EmployeeSaleWhereUniqueInput
    update?: XOR<XOR<EmployeeSaleUpdateToOneWithWhereWithoutUserInput, EmployeeSaleUpdateWithoutUserInput>, EmployeeSaleUncheckedUpdateWithoutUserInput>
  }

  export type MonthlyTargetUpdateManyWithoutUserNestedInput = {
    create?: XOR<MonthlyTargetCreateWithoutUserInput, MonthlyTargetUncheckedCreateWithoutUserInput> | MonthlyTargetCreateWithoutUserInput[] | MonthlyTargetUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MonthlyTargetCreateOrConnectWithoutUserInput | MonthlyTargetCreateOrConnectWithoutUserInput[]
    upsert?: MonthlyTargetUpsertWithWhereUniqueWithoutUserInput | MonthlyTargetUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: MonthlyTargetCreateManyUserInputEnvelope
    set?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
    disconnect?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
    delete?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
    connect?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
    update?: MonthlyTargetUpdateWithWhereUniqueWithoutUserInput | MonthlyTargetUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: MonthlyTargetUpdateManyWithWhereWithoutUserInput | MonthlyTargetUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: MonthlyTargetScalarWhereInput | MonthlyTargetScalarWhereInput[]
  }

  export type CompanyUpdateManyWithoutAssignedUserNestedInput = {
    create?: XOR<CompanyCreateWithoutAssignedUserInput, CompanyUncheckedCreateWithoutAssignedUserInput> | CompanyCreateWithoutAssignedUserInput[] | CompanyUncheckedCreateWithoutAssignedUserInput[]
    connectOrCreate?: CompanyCreateOrConnectWithoutAssignedUserInput | CompanyCreateOrConnectWithoutAssignedUserInput[]
    upsert?: CompanyUpsertWithWhereUniqueWithoutAssignedUserInput | CompanyUpsertWithWhereUniqueWithoutAssignedUserInput[]
    createMany?: CompanyCreateManyAssignedUserInputEnvelope
    set?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
    disconnect?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
    delete?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
    connect?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
    update?: CompanyUpdateWithWhereUniqueWithoutAssignedUserInput | CompanyUpdateWithWhereUniqueWithoutAssignedUserInput[]
    updateMany?: CompanyUpdateManyWithWhereWithoutAssignedUserInput | CompanyUpdateManyWithWhereWithoutAssignedUserInput[]
    deleteMany?: CompanyScalarWhereInput | CompanyScalarWhereInput[]
  }

  export type QuotationUncheckedUpdateManyWithoutSalespersonNestedInput = {
    create?: XOR<QuotationCreateWithoutSalespersonInput, QuotationUncheckedCreateWithoutSalespersonInput> | QuotationCreateWithoutSalespersonInput[] | QuotationUncheckedCreateWithoutSalespersonInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutSalespersonInput | QuotationCreateOrConnectWithoutSalespersonInput[]
    upsert?: QuotationUpsertWithWhereUniqueWithoutSalespersonInput | QuotationUpsertWithWhereUniqueWithoutSalespersonInput[]
    createMany?: QuotationCreateManySalespersonInputEnvelope
    set?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    disconnect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    delete?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    update?: QuotationUpdateWithWhereUniqueWithoutSalespersonInput | QuotationUpdateWithWhereUniqueWithoutSalespersonInput[]
    updateMany?: QuotationUpdateManyWithWhereWithoutSalespersonInput | QuotationUpdateManyWithWhereWithoutSalespersonInput[]
    deleteMany?: QuotationScalarWhereInput | QuotationScalarWhereInput[]
  }

  export type ScheduleUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ScheduleCreateWithoutUserInput, ScheduleUncheckedCreateWithoutUserInput> | ScheduleCreateWithoutUserInput[] | ScheduleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ScheduleCreateOrConnectWithoutUserInput | ScheduleCreateOrConnectWithoutUserInput[]
    upsert?: ScheduleUpsertWithWhereUniqueWithoutUserInput | ScheduleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ScheduleCreateManyUserInputEnvelope
    set?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    disconnect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    delete?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    connect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    update?: ScheduleUpdateWithWhereUniqueWithoutUserInput | ScheduleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ScheduleUpdateManyWithWhereWithoutUserInput | ScheduleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ScheduleScalarWhereInput | ScheduleScalarWhereInput[]
  }

  export type TelesaleUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TelesaleCreateWithoutUserInput, TelesaleUncheckedCreateWithoutUserInput> | TelesaleCreateWithoutUserInput[] | TelesaleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TelesaleCreateOrConnectWithoutUserInput | TelesaleCreateOrConnectWithoutUserInput[]
    upsert?: TelesaleUpsertWithWhereUniqueWithoutUserInput | TelesaleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TelesaleCreateManyUserInputEnvelope
    set?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    disconnect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    delete?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    connect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    update?: TelesaleUpdateWithWhereUniqueWithoutUserInput | TelesaleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TelesaleUpdateManyWithWhereWithoutUserInput | TelesaleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TelesaleScalarWhereInput | TelesaleScalarWhereInput[]
  }

  export type EmployeeSaleUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<EmployeeSaleCreateWithoutUserInput, EmployeeSaleUncheckedCreateWithoutUserInput>
    connectOrCreate?: EmployeeSaleCreateOrConnectWithoutUserInput
    upsert?: EmployeeSaleUpsertWithoutUserInput
    disconnect?: EmployeeSaleWhereInput | boolean
    delete?: EmployeeSaleWhereInput | boolean
    connect?: EmployeeSaleWhereUniqueInput
    update?: XOR<XOR<EmployeeSaleUpdateToOneWithWhereWithoutUserInput, EmployeeSaleUpdateWithoutUserInput>, EmployeeSaleUncheckedUpdateWithoutUserInput>
  }

  export type MonthlyTargetUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<MonthlyTargetCreateWithoutUserInput, MonthlyTargetUncheckedCreateWithoutUserInput> | MonthlyTargetCreateWithoutUserInput[] | MonthlyTargetUncheckedCreateWithoutUserInput[]
    connectOrCreate?: MonthlyTargetCreateOrConnectWithoutUserInput | MonthlyTargetCreateOrConnectWithoutUserInput[]
    upsert?: MonthlyTargetUpsertWithWhereUniqueWithoutUserInput | MonthlyTargetUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: MonthlyTargetCreateManyUserInputEnvelope
    set?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
    disconnect?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
    delete?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
    connect?: MonthlyTargetWhereUniqueInput | MonthlyTargetWhereUniqueInput[]
    update?: MonthlyTargetUpdateWithWhereUniqueWithoutUserInput | MonthlyTargetUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: MonthlyTargetUpdateManyWithWhereWithoutUserInput | MonthlyTargetUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: MonthlyTargetScalarWhereInput | MonthlyTargetScalarWhereInput[]
  }

  export type CompanyUncheckedUpdateManyWithoutAssignedUserNestedInput = {
    create?: XOR<CompanyCreateWithoutAssignedUserInput, CompanyUncheckedCreateWithoutAssignedUserInput> | CompanyCreateWithoutAssignedUserInput[] | CompanyUncheckedCreateWithoutAssignedUserInput[]
    connectOrCreate?: CompanyCreateOrConnectWithoutAssignedUserInput | CompanyCreateOrConnectWithoutAssignedUserInput[]
    upsert?: CompanyUpsertWithWhereUniqueWithoutAssignedUserInput | CompanyUpsertWithWhereUniqueWithoutAssignedUserInput[]
    createMany?: CompanyCreateManyAssignedUserInputEnvelope
    set?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
    disconnect?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
    delete?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
    connect?: CompanyWhereUniqueInput | CompanyWhereUniqueInput[]
    update?: CompanyUpdateWithWhereUniqueWithoutAssignedUserInput | CompanyUpdateWithWhereUniqueWithoutAssignedUserInput[]
    updateMany?: CompanyUpdateManyWithWhereWithoutAssignedUserInput | CompanyUpdateManyWithWhereWithoutAssignedUserInput[]
    deleteMany?: CompanyScalarWhereInput | CompanyScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutMonthlyTargetsInput = {
    create?: XOR<UserCreateWithoutMonthlyTargetsInput, UserUncheckedCreateWithoutMonthlyTargetsInput>
    connectOrCreate?: UserCreateOrConnectWithoutMonthlyTargetsInput
    connect?: UserWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneWithoutMonthlyTargetsNestedInput = {
    create?: XOR<UserCreateWithoutMonthlyTargetsInput, UserUncheckedCreateWithoutMonthlyTargetsInput>
    connectOrCreate?: UserCreateOrConnectWithoutMonthlyTargetsInput
    upsert?: UserUpsertWithoutMonthlyTargetsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutMonthlyTargetsInput, UserUpdateWithoutMonthlyTargetsInput>, UserUncheckedUpdateWithoutMonthlyTargetsInput>
  }

  export type UserCreateNestedOneWithoutSchedulesInput = {
    create?: XOR<UserCreateWithoutSchedulesInput, UserUncheckedCreateWithoutSchedulesInput>
    connectOrCreate?: UserCreateOrConnectWithoutSchedulesInput
    connect?: UserWhereUniqueInput
  }

  export type CompanyCreateNestedOneWithoutSchedulesInput = {
    create?: XOR<CompanyCreateWithoutSchedulesInput, CompanyUncheckedCreateWithoutSchedulesInput>
    connectOrCreate?: CompanyCreateOrConnectWithoutSchedulesInput
    connect?: CompanyWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutSchedulesNestedInput = {
    create?: XOR<UserCreateWithoutSchedulesInput, UserUncheckedCreateWithoutSchedulesInput>
    connectOrCreate?: UserCreateOrConnectWithoutSchedulesInput
    upsert?: UserUpsertWithoutSchedulesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSchedulesInput, UserUpdateWithoutSchedulesInput>, UserUncheckedUpdateWithoutSchedulesInput>
  }

  export type CompanyUpdateOneWithoutSchedulesNestedInput = {
    create?: XOR<CompanyCreateWithoutSchedulesInput, CompanyUncheckedCreateWithoutSchedulesInput>
    connectOrCreate?: CompanyCreateOrConnectWithoutSchedulesInput
    upsert?: CompanyUpsertWithoutSchedulesInput
    disconnect?: CompanyWhereInput | boolean
    delete?: CompanyWhereInput | boolean
    connect?: CompanyWhereUniqueInput
    update?: XOR<XOR<CompanyUpdateToOneWithWhereWithoutSchedulesInput, CompanyUpdateWithoutSchedulesInput>, CompanyUncheckedUpdateWithoutSchedulesInput>
  }

  export type UserCreateNestedOneWithoutEmployeeSaleInput = {
    create?: XOR<UserCreateWithoutEmployeeSaleInput, UserUncheckedCreateWithoutEmployeeSaleInput>
    connectOrCreate?: UserCreateOrConnectWithoutEmployeeSaleInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneWithoutEmployeeSaleNestedInput = {
    create?: XOR<UserCreateWithoutEmployeeSaleInput, UserUncheckedCreateWithoutEmployeeSaleInput>
    connectOrCreate?: UserCreateOrConnectWithoutEmployeeSaleInput
    upsert?: UserUpsertWithoutEmployeeSaleInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutEmployeeSaleInput, UserUpdateWithoutEmployeeSaleInput>, UserUncheckedUpdateWithoutEmployeeSaleInput>
  }

  export type ContactCreateNestedManyWithoutCompanyInput = {
    create?: XOR<ContactCreateWithoutCompanyInput, ContactUncheckedCreateWithoutCompanyInput> | ContactCreateWithoutCompanyInput[] | ContactUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: ContactCreateOrConnectWithoutCompanyInput | ContactCreateOrConnectWithoutCompanyInput[]
    createMany?: ContactCreateManyCompanyInputEnvelope
    connect?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
  }

  export type QuotationCreateNestedManyWithoutCompanyInput = {
    create?: XOR<QuotationCreateWithoutCompanyInput, QuotationUncheckedCreateWithoutCompanyInput> | QuotationCreateWithoutCompanyInput[] | QuotationUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutCompanyInput | QuotationCreateOrConnectWithoutCompanyInput[]
    createMany?: QuotationCreateManyCompanyInputEnvelope
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
  }

  export type TelesaleCreateNestedManyWithoutCompanyInput = {
    create?: XOR<TelesaleCreateWithoutCompanyInput, TelesaleUncheckedCreateWithoutCompanyInput> | TelesaleCreateWithoutCompanyInput[] | TelesaleUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: TelesaleCreateOrConnectWithoutCompanyInput | TelesaleCreateOrConnectWithoutCompanyInput[]
    createMany?: TelesaleCreateManyCompanyInputEnvelope
    connect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
  }

  export type ScheduleCreateNestedManyWithoutCompanyInput = {
    create?: XOR<ScheduleCreateWithoutCompanyInput, ScheduleUncheckedCreateWithoutCompanyInput> | ScheduleCreateWithoutCompanyInput[] | ScheduleUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: ScheduleCreateOrConnectWithoutCompanyInput | ScheduleCreateOrConnectWithoutCompanyInput[]
    createMany?: ScheduleCreateManyCompanyInputEnvelope
    connect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutAssignedCompaniesInput = {
    create?: XOR<UserCreateWithoutAssignedCompaniesInput, UserUncheckedCreateWithoutAssignedCompaniesInput>
    connectOrCreate?: UserCreateOrConnectWithoutAssignedCompaniesInput
    connect?: UserWhereUniqueInput
  }

  export type ContactUncheckedCreateNestedManyWithoutCompanyInput = {
    create?: XOR<ContactCreateWithoutCompanyInput, ContactUncheckedCreateWithoutCompanyInput> | ContactCreateWithoutCompanyInput[] | ContactUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: ContactCreateOrConnectWithoutCompanyInput | ContactCreateOrConnectWithoutCompanyInput[]
    createMany?: ContactCreateManyCompanyInputEnvelope
    connect?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
  }

  export type QuotationUncheckedCreateNestedManyWithoutCompanyInput = {
    create?: XOR<QuotationCreateWithoutCompanyInput, QuotationUncheckedCreateWithoutCompanyInput> | QuotationCreateWithoutCompanyInput[] | QuotationUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutCompanyInput | QuotationCreateOrConnectWithoutCompanyInput[]
    createMany?: QuotationCreateManyCompanyInputEnvelope
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
  }

  export type TelesaleUncheckedCreateNestedManyWithoutCompanyInput = {
    create?: XOR<TelesaleCreateWithoutCompanyInput, TelesaleUncheckedCreateWithoutCompanyInput> | TelesaleCreateWithoutCompanyInput[] | TelesaleUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: TelesaleCreateOrConnectWithoutCompanyInput | TelesaleCreateOrConnectWithoutCompanyInput[]
    createMany?: TelesaleCreateManyCompanyInputEnvelope
    connect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
  }

  export type ScheduleUncheckedCreateNestedManyWithoutCompanyInput = {
    create?: XOR<ScheduleCreateWithoutCompanyInput, ScheduleUncheckedCreateWithoutCompanyInput> | ScheduleCreateWithoutCompanyInput[] | ScheduleUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: ScheduleCreateOrConnectWithoutCompanyInput | ScheduleCreateOrConnectWithoutCompanyInput[]
    createMany?: ScheduleCreateManyCompanyInputEnvelope
    connect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
  }

  export type ContactUpdateManyWithoutCompanyNestedInput = {
    create?: XOR<ContactCreateWithoutCompanyInput, ContactUncheckedCreateWithoutCompanyInput> | ContactCreateWithoutCompanyInput[] | ContactUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: ContactCreateOrConnectWithoutCompanyInput | ContactCreateOrConnectWithoutCompanyInput[]
    upsert?: ContactUpsertWithWhereUniqueWithoutCompanyInput | ContactUpsertWithWhereUniqueWithoutCompanyInput[]
    createMany?: ContactCreateManyCompanyInputEnvelope
    set?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
    disconnect?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
    delete?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
    connect?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
    update?: ContactUpdateWithWhereUniqueWithoutCompanyInput | ContactUpdateWithWhereUniqueWithoutCompanyInput[]
    updateMany?: ContactUpdateManyWithWhereWithoutCompanyInput | ContactUpdateManyWithWhereWithoutCompanyInput[]
    deleteMany?: ContactScalarWhereInput | ContactScalarWhereInput[]
  }

  export type QuotationUpdateManyWithoutCompanyNestedInput = {
    create?: XOR<QuotationCreateWithoutCompanyInput, QuotationUncheckedCreateWithoutCompanyInput> | QuotationCreateWithoutCompanyInput[] | QuotationUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutCompanyInput | QuotationCreateOrConnectWithoutCompanyInput[]
    upsert?: QuotationUpsertWithWhereUniqueWithoutCompanyInput | QuotationUpsertWithWhereUniqueWithoutCompanyInput[]
    createMany?: QuotationCreateManyCompanyInputEnvelope
    set?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    disconnect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    delete?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    update?: QuotationUpdateWithWhereUniqueWithoutCompanyInput | QuotationUpdateWithWhereUniqueWithoutCompanyInput[]
    updateMany?: QuotationUpdateManyWithWhereWithoutCompanyInput | QuotationUpdateManyWithWhereWithoutCompanyInput[]
    deleteMany?: QuotationScalarWhereInput | QuotationScalarWhereInput[]
  }

  export type TelesaleUpdateManyWithoutCompanyNestedInput = {
    create?: XOR<TelesaleCreateWithoutCompanyInput, TelesaleUncheckedCreateWithoutCompanyInput> | TelesaleCreateWithoutCompanyInput[] | TelesaleUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: TelesaleCreateOrConnectWithoutCompanyInput | TelesaleCreateOrConnectWithoutCompanyInput[]
    upsert?: TelesaleUpsertWithWhereUniqueWithoutCompanyInput | TelesaleUpsertWithWhereUniqueWithoutCompanyInput[]
    createMany?: TelesaleCreateManyCompanyInputEnvelope
    set?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    disconnect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    delete?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    connect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    update?: TelesaleUpdateWithWhereUniqueWithoutCompanyInput | TelesaleUpdateWithWhereUniqueWithoutCompanyInput[]
    updateMany?: TelesaleUpdateManyWithWhereWithoutCompanyInput | TelesaleUpdateManyWithWhereWithoutCompanyInput[]
    deleteMany?: TelesaleScalarWhereInput | TelesaleScalarWhereInput[]
  }

  export type ScheduleUpdateManyWithoutCompanyNestedInput = {
    create?: XOR<ScheduleCreateWithoutCompanyInput, ScheduleUncheckedCreateWithoutCompanyInput> | ScheduleCreateWithoutCompanyInput[] | ScheduleUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: ScheduleCreateOrConnectWithoutCompanyInput | ScheduleCreateOrConnectWithoutCompanyInput[]
    upsert?: ScheduleUpsertWithWhereUniqueWithoutCompanyInput | ScheduleUpsertWithWhereUniqueWithoutCompanyInput[]
    createMany?: ScheduleCreateManyCompanyInputEnvelope
    set?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    disconnect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    delete?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    connect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    update?: ScheduleUpdateWithWhereUniqueWithoutCompanyInput | ScheduleUpdateWithWhereUniqueWithoutCompanyInput[]
    updateMany?: ScheduleUpdateManyWithWhereWithoutCompanyInput | ScheduleUpdateManyWithWhereWithoutCompanyInput[]
    deleteMany?: ScheduleScalarWhereInput | ScheduleScalarWhereInput[]
  }

  export type UserUpdateOneWithoutAssignedCompaniesNestedInput = {
    create?: XOR<UserCreateWithoutAssignedCompaniesInput, UserUncheckedCreateWithoutAssignedCompaniesInput>
    connectOrCreate?: UserCreateOrConnectWithoutAssignedCompaniesInput
    upsert?: UserUpsertWithoutAssignedCompaniesInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAssignedCompaniesInput, UserUpdateWithoutAssignedCompaniesInput>, UserUncheckedUpdateWithoutAssignedCompaniesInput>
  }

  export type ContactUncheckedUpdateManyWithoutCompanyNestedInput = {
    create?: XOR<ContactCreateWithoutCompanyInput, ContactUncheckedCreateWithoutCompanyInput> | ContactCreateWithoutCompanyInput[] | ContactUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: ContactCreateOrConnectWithoutCompanyInput | ContactCreateOrConnectWithoutCompanyInput[]
    upsert?: ContactUpsertWithWhereUniqueWithoutCompanyInput | ContactUpsertWithWhereUniqueWithoutCompanyInput[]
    createMany?: ContactCreateManyCompanyInputEnvelope
    set?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
    disconnect?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
    delete?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
    connect?: ContactWhereUniqueInput | ContactWhereUniqueInput[]
    update?: ContactUpdateWithWhereUniqueWithoutCompanyInput | ContactUpdateWithWhereUniqueWithoutCompanyInput[]
    updateMany?: ContactUpdateManyWithWhereWithoutCompanyInput | ContactUpdateManyWithWhereWithoutCompanyInput[]
    deleteMany?: ContactScalarWhereInput | ContactScalarWhereInput[]
  }

  export type QuotationUncheckedUpdateManyWithoutCompanyNestedInput = {
    create?: XOR<QuotationCreateWithoutCompanyInput, QuotationUncheckedCreateWithoutCompanyInput> | QuotationCreateWithoutCompanyInput[] | QuotationUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutCompanyInput | QuotationCreateOrConnectWithoutCompanyInput[]
    upsert?: QuotationUpsertWithWhereUniqueWithoutCompanyInput | QuotationUpsertWithWhereUniqueWithoutCompanyInput[]
    createMany?: QuotationCreateManyCompanyInputEnvelope
    set?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    disconnect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    delete?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    update?: QuotationUpdateWithWhereUniqueWithoutCompanyInput | QuotationUpdateWithWhereUniqueWithoutCompanyInput[]
    updateMany?: QuotationUpdateManyWithWhereWithoutCompanyInput | QuotationUpdateManyWithWhereWithoutCompanyInput[]
    deleteMany?: QuotationScalarWhereInput | QuotationScalarWhereInput[]
  }

  export type TelesaleUncheckedUpdateManyWithoutCompanyNestedInput = {
    create?: XOR<TelesaleCreateWithoutCompanyInput, TelesaleUncheckedCreateWithoutCompanyInput> | TelesaleCreateWithoutCompanyInput[] | TelesaleUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: TelesaleCreateOrConnectWithoutCompanyInput | TelesaleCreateOrConnectWithoutCompanyInput[]
    upsert?: TelesaleUpsertWithWhereUniqueWithoutCompanyInput | TelesaleUpsertWithWhereUniqueWithoutCompanyInput[]
    createMany?: TelesaleCreateManyCompanyInputEnvelope
    set?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    disconnect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    delete?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    connect?: TelesaleWhereUniqueInput | TelesaleWhereUniqueInput[]
    update?: TelesaleUpdateWithWhereUniqueWithoutCompanyInput | TelesaleUpdateWithWhereUniqueWithoutCompanyInput[]
    updateMany?: TelesaleUpdateManyWithWhereWithoutCompanyInput | TelesaleUpdateManyWithWhereWithoutCompanyInput[]
    deleteMany?: TelesaleScalarWhereInput | TelesaleScalarWhereInput[]
  }

  export type ScheduleUncheckedUpdateManyWithoutCompanyNestedInput = {
    create?: XOR<ScheduleCreateWithoutCompanyInput, ScheduleUncheckedCreateWithoutCompanyInput> | ScheduleCreateWithoutCompanyInput[] | ScheduleUncheckedCreateWithoutCompanyInput[]
    connectOrCreate?: ScheduleCreateOrConnectWithoutCompanyInput | ScheduleCreateOrConnectWithoutCompanyInput[]
    upsert?: ScheduleUpsertWithWhereUniqueWithoutCompanyInput | ScheduleUpsertWithWhereUniqueWithoutCompanyInput[]
    createMany?: ScheduleCreateManyCompanyInputEnvelope
    set?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    disconnect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    delete?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    connect?: ScheduleWhereUniqueInput | ScheduleWhereUniqueInput[]
    update?: ScheduleUpdateWithWhereUniqueWithoutCompanyInput | ScheduleUpdateWithWhereUniqueWithoutCompanyInput[]
    updateMany?: ScheduleUpdateManyWithWhereWithoutCompanyInput | ScheduleUpdateManyWithWhereWithoutCompanyInput[]
    deleteMany?: ScheduleScalarWhereInput | ScheduleScalarWhereInput[]
  }

  export type CompanyCreateNestedOneWithoutContactsInput = {
    create?: XOR<CompanyCreateWithoutContactsInput, CompanyUncheckedCreateWithoutContactsInput>
    connectOrCreate?: CompanyCreateOrConnectWithoutContactsInput
    connect?: CompanyWhereUniqueInput
  }

  export type QuotationCreateNestedManyWithoutContactInput = {
    create?: XOR<QuotationCreateWithoutContactInput, QuotationUncheckedCreateWithoutContactInput> | QuotationCreateWithoutContactInput[] | QuotationUncheckedCreateWithoutContactInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutContactInput | QuotationCreateOrConnectWithoutContactInput[]
    createMany?: QuotationCreateManyContactInputEnvelope
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
  }

  export type QuotationUncheckedCreateNestedManyWithoutContactInput = {
    create?: XOR<QuotationCreateWithoutContactInput, QuotationUncheckedCreateWithoutContactInput> | QuotationCreateWithoutContactInput[] | QuotationUncheckedCreateWithoutContactInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutContactInput | QuotationCreateOrConnectWithoutContactInput[]
    createMany?: QuotationCreateManyContactInputEnvelope
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
  }

  export type CompanyUpdateOneRequiredWithoutContactsNestedInput = {
    create?: XOR<CompanyCreateWithoutContactsInput, CompanyUncheckedCreateWithoutContactsInput>
    connectOrCreate?: CompanyCreateOrConnectWithoutContactsInput
    upsert?: CompanyUpsertWithoutContactsInput
    connect?: CompanyWhereUniqueInput
    update?: XOR<XOR<CompanyUpdateToOneWithWhereWithoutContactsInput, CompanyUpdateWithoutContactsInput>, CompanyUncheckedUpdateWithoutContactsInput>
  }

  export type QuotationUpdateManyWithoutContactNestedInput = {
    create?: XOR<QuotationCreateWithoutContactInput, QuotationUncheckedCreateWithoutContactInput> | QuotationCreateWithoutContactInput[] | QuotationUncheckedCreateWithoutContactInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutContactInput | QuotationCreateOrConnectWithoutContactInput[]
    upsert?: QuotationUpsertWithWhereUniqueWithoutContactInput | QuotationUpsertWithWhereUniqueWithoutContactInput[]
    createMany?: QuotationCreateManyContactInputEnvelope
    set?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    disconnect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    delete?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    update?: QuotationUpdateWithWhereUniqueWithoutContactInput | QuotationUpdateWithWhereUniqueWithoutContactInput[]
    updateMany?: QuotationUpdateManyWithWhereWithoutContactInput | QuotationUpdateManyWithWhereWithoutContactInput[]
    deleteMany?: QuotationScalarWhereInput | QuotationScalarWhereInput[]
  }

  export type QuotationUncheckedUpdateManyWithoutContactNestedInput = {
    create?: XOR<QuotationCreateWithoutContactInput, QuotationUncheckedCreateWithoutContactInput> | QuotationCreateWithoutContactInput[] | QuotationUncheckedCreateWithoutContactInput[]
    connectOrCreate?: QuotationCreateOrConnectWithoutContactInput | QuotationCreateOrConnectWithoutContactInput[]
    upsert?: QuotationUpsertWithWhereUniqueWithoutContactInput | QuotationUpsertWithWhereUniqueWithoutContactInput[]
    createMany?: QuotationCreateManyContactInputEnvelope
    set?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    disconnect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    delete?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    connect?: QuotationWhereUniqueInput | QuotationWhereUniqueInput[]
    update?: QuotationUpdateWithWhereUniqueWithoutContactInput | QuotationUpdateWithWhereUniqueWithoutContactInput[]
    updateMany?: QuotationUpdateManyWithWhereWithoutContactInput | QuotationUpdateManyWithWhereWithoutContactInput[]
    deleteMany?: QuotationScalarWhereInput | QuotationScalarWhereInput[]
  }

  export type CompanyCreateNestedOneWithoutQuotationsInput = {
    create?: XOR<CompanyCreateWithoutQuotationsInput, CompanyUncheckedCreateWithoutQuotationsInput>
    connectOrCreate?: CompanyCreateOrConnectWithoutQuotationsInput
    connect?: CompanyWhereUniqueInput
  }

  export type ContactCreateNestedOneWithoutQuotationsInput = {
    create?: XOR<ContactCreateWithoutQuotationsInput, ContactUncheckedCreateWithoutQuotationsInput>
    connectOrCreate?: ContactCreateOrConnectWithoutQuotationsInput
    connect?: ContactWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutQuotationsInput = {
    create?: XOR<UserCreateWithoutQuotationsInput, UserUncheckedCreateWithoutQuotationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutQuotationsInput
    connect?: UserWhereUniqueInput
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type CompanyUpdateOneRequiredWithoutQuotationsNestedInput = {
    create?: XOR<CompanyCreateWithoutQuotationsInput, CompanyUncheckedCreateWithoutQuotationsInput>
    connectOrCreate?: CompanyCreateOrConnectWithoutQuotationsInput
    upsert?: CompanyUpsertWithoutQuotationsInput
    connect?: CompanyWhereUniqueInput
    update?: XOR<XOR<CompanyUpdateToOneWithWhereWithoutQuotationsInput, CompanyUpdateWithoutQuotationsInput>, CompanyUncheckedUpdateWithoutQuotationsInput>
  }

  export type ContactUpdateOneWithoutQuotationsNestedInput = {
    create?: XOR<ContactCreateWithoutQuotationsInput, ContactUncheckedCreateWithoutQuotationsInput>
    connectOrCreate?: ContactCreateOrConnectWithoutQuotationsInput
    upsert?: ContactUpsertWithoutQuotationsInput
    disconnect?: ContactWhereInput | boolean
    delete?: ContactWhereInput | boolean
    connect?: ContactWhereUniqueInput
    update?: XOR<XOR<ContactUpdateToOneWithWhereWithoutQuotationsInput, ContactUpdateWithoutQuotationsInput>, ContactUncheckedUpdateWithoutQuotationsInput>
  }

  export type UserUpdateOneWithoutQuotationsNestedInput = {
    create?: XOR<UserCreateWithoutQuotationsInput, UserUncheckedCreateWithoutQuotationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutQuotationsInput
    upsert?: UserUpsertWithoutQuotationsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutQuotationsInput, UserUpdateWithoutQuotationsInput>, UserUncheckedUpdateWithoutQuotationsInput>
  }

  export type CompanyCreateNestedOneWithoutTelesalesInput = {
    create?: XOR<CompanyCreateWithoutTelesalesInput, CompanyUncheckedCreateWithoutTelesalesInput>
    connectOrCreate?: CompanyCreateOrConnectWithoutTelesalesInput
    connect?: CompanyWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutTelesalesInput = {
    create?: XOR<UserCreateWithoutTelesalesInput, UserUncheckedCreateWithoutTelesalesInput>
    connectOrCreate?: UserCreateOrConnectWithoutTelesalesInput
    connect?: UserWhereUniqueInput
  }

  export type CompanyUpdateOneRequiredWithoutTelesalesNestedInput = {
    create?: XOR<CompanyCreateWithoutTelesalesInput, CompanyUncheckedCreateWithoutTelesalesInput>
    connectOrCreate?: CompanyCreateOrConnectWithoutTelesalesInput
    upsert?: CompanyUpsertWithoutTelesalesInput
    connect?: CompanyWhereUniqueInput
    update?: XOR<XOR<CompanyUpdateToOneWithWhereWithoutTelesalesInput, CompanyUpdateWithoutTelesalesInput>, CompanyUncheckedUpdateWithoutTelesalesInput>
  }

  export type UserUpdateOneWithoutTelesalesNestedInput = {
    create?: XOR<UserCreateWithoutTelesalesInput, UserUncheckedCreateWithoutTelesalesInput>
    connectOrCreate?: UserCreateOrConnectWithoutTelesalesInput
    upsert?: UserUpsertWithoutTelesalesInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTelesalesInput, UserUpdateWithoutTelesalesInput>, UserUncheckedUpdateWithoutTelesalesInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type QuotationCreateWithoutSalespersonInput = {
    id?: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    subject?: string | null
    winLossReason?: string | null
    company: CompanyCreateNestedOneWithoutQuotationsInput
    contact?: ContactCreateNestedOneWithoutQuotationsInput
  }

  export type QuotationUncheckedCreateWithoutSalespersonInput = {
    id?: string
    companyId: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    contactId?: string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    subject?: string | null
    winLossReason?: string | null
  }

  export type QuotationCreateOrConnectWithoutSalespersonInput = {
    where: QuotationWhereUniqueInput
    create: XOR<QuotationCreateWithoutSalespersonInput, QuotationUncheckedCreateWithoutSalespersonInput>
  }

  export type QuotationCreateManySalespersonInputEnvelope = {
    data: QuotationCreateManySalespersonInput | QuotationCreateManySalespersonInput[]
    skipDuplicates?: boolean
  }

  export type ScheduleCreateWithoutUserInput = {
    id?: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    company?: CompanyCreateNestedOneWithoutSchedulesInput
  }

  export type ScheduleUncheckedCreateWithoutUserInput = {
    id?: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    companyId?: string | null
  }

  export type ScheduleCreateOrConnectWithoutUserInput = {
    where: ScheduleWhereUniqueInput
    create: XOR<ScheduleCreateWithoutUserInput, ScheduleUncheckedCreateWithoutUserInput>
  }

  export type ScheduleCreateManyUserInputEnvelope = {
    data: ScheduleCreateManyUserInput | ScheduleCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type TelesaleCreateWithoutUserInput = {
    id?: string
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
    company: CompanyCreateNestedOneWithoutTelesalesInput
  }

  export type TelesaleUncheckedCreateWithoutUserInput = {
    id?: string
    companyId: string
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
  }

  export type TelesaleCreateOrConnectWithoutUserInput = {
    where: TelesaleWhereUniqueInput
    create: XOR<TelesaleCreateWithoutUserInput, TelesaleUncheckedCreateWithoutUserInput>
  }

  export type TelesaleCreateManyUserInputEnvelope = {
    data: TelesaleCreateManyUserInput | TelesaleCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type EmployeeSaleCreateWithoutUserInput = {
    id?: string
    employeeId?: string | null
    fullName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    nickname?: string | null
    branch?: string | null
    teamLeader?: string | null
    position?: string | null
    department?: string | null
    startDate?: Date | string | null
  }

  export type EmployeeSaleUncheckedCreateWithoutUserInput = {
    id?: string
    employeeId?: string | null
    fullName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    nickname?: string | null
    branch?: string | null
    teamLeader?: string | null
    position?: string | null
    department?: string | null
    startDate?: Date | string | null
  }

  export type EmployeeSaleCreateOrConnectWithoutUserInput = {
    where: EmployeeSaleWhereUniqueInput
    create: XOR<EmployeeSaleCreateWithoutUserInput, EmployeeSaleUncheckedCreateWithoutUserInput>
  }

  export type MonthlyTargetCreateWithoutUserInput = {
    id?: string
    month: number
    year: number
    amount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MonthlyTargetUncheckedCreateWithoutUserInput = {
    id?: string
    month: number
    year: number
    amount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MonthlyTargetCreateOrConnectWithoutUserInput = {
    where: MonthlyTargetWhereUniqueInput
    create: XOR<MonthlyTargetCreateWithoutUserInput, MonthlyTargetUncheckedCreateWithoutUserInput>
  }

  export type MonthlyTargetCreateManyUserInputEnvelope = {
    data: MonthlyTargetCreateManyUserInput | MonthlyTargetCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type CompanyCreateWithoutAssignedUserInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    contacts?: ContactCreateNestedManyWithoutCompanyInput
    quotations?: QuotationCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleCreateNestedManyWithoutCompanyInput
  }

  export type CompanyUncheckedCreateWithoutAssignedUserInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    contacts?: ContactUncheckedCreateNestedManyWithoutCompanyInput
    quotations?: QuotationUncheckedCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutCompanyInput
  }

  export type CompanyCreateOrConnectWithoutAssignedUserInput = {
    where: CompanyWhereUniqueInput
    create: XOR<CompanyCreateWithoutAssignedUserInput, CompanyUncheckedCreateWithoutAssignedUserInput>
  }

  export type CompanyCreateManyAssignedUserInputEnvelope = {
    data: CompanyCreateManyAssignedUserInput | CompanyCreateManyAssignedUserInput[]
    skipDuplicates?: boolean
  }

  export type QuotationUpsertWithWhereUniqueWithoutSalespersonInput = {
    where: QuotationWhereUniqueInput
    update: XOR<QuotationUpdateWithoutSalespersonInput, QuotationUncheckedUpdateWithoutSalespersonInput>
    create: XOR<QuotationCreateWithoutSalespersonInput, QuotationUncheckedCreateWithoutSalespersonInput>
  }

  export type QuotationUpdateWithWhereUniqueWithoutSalespersonInput = {
    where: QuotationWhereUniqueInput
    data: XOR<QuotationUpdateWithoutSalespersonInput, QuotationUncheckedUpdateWithoutSalespersonInput>
  }

  export type QuotationUpdateManyWithWhereWithoutSalespersonInput = {
    where: QuotationScalarWhereInput
    data: XOR<QuotationUpdateManyMutationInput, QuotationUncheckedUpdateManyWithoutSalespersonInput>
  }

  export type QuotationScalarWhereInput = {
    AND?: QuotationScalarWhereInput | QuotationScalarWhereInput[]
    OR?: QuotationScalarWhereInput[]
    NOT?: QuotationScalarWhereInput | QuotationScalarWhereInput[]
    id?: StringFilter<"Quotation"> | string
    companyId?: StringFilter<"Quotation"> | string
    status?: StringFilter<"Quotation"> | string
    salesBeforeVat?: FloatNullableFilter<"Quotation"> | number | null
    transportationFee?: FloatNullableFilter<"Quotation"> | number | null
    installationFee?: FloatNullableFilter<"Quotation"> | number | null
    totalAmountBeforeVat?: FloatNullableFilter<"Quotation"> | number | null
    actualClosingAmount?: FloatNullableFilter<"Quotation"> | number | null
    createdAt?: DateTimeFilter<"Quotation"> | Date | string
    updatedAt?: DateTimeFilter<"Quotation"> | Date | string
    billingDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    contactId?: StringNullableFilter<"Quotation"> | string | null
    followUp1?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp2?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp3?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    followUp4?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    invoiceNumber?: StringNullableFilter<"Quotation"> | string | null
    poDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    productType?: StringNullableFilter<"Quotation"> | string | null
    quotationDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    quotationNumber?: StringNullableFilter<"Quotation"> | string | null
    rejectReason?: StringNullableFilter<"Quotation"> | string | null
    remarks?: StringNullableFilter<"Quotation"> | string | null
    requirementDate?: DateTimeNullableFilter<"Quotation"> | Date | string | null
    requirementNumber?: StringNullableFilter<"Quotation"> | string | null
    salesBranch?: StringNullableFilter<"Quotation"> | string | null
    salesTeamLeader?: StringNullableFilter<"Quotation"> | string | null
    salespersonId?: StringNullableFilter<"Quotation"> | string | null
    subject?: StringNullableFilter<"Quotation"> | string | null
    winLossReason?: StringNullableFilter<"Quotation"> | string | null
  }

  export type ScheduleUpsertWithWhereUniqueWithoutUserInput = {
    where: ScheduleWhereUniqueInput
    update: XOR<ScheduleUpdateWithoutUserInput, ScheduleUncheckedUpdateWithoutUserInput>
    create: XOR<ScheduleCreateWithoutUserInput, ScheduleUncheckedCreateWithoutUserInput>
  }

  export type ScheduleUpdateWithWhereUniqueWithoutUserInput = {
    where: ScheduleWhereUniqueInput
    data: XOR<ScheduleUpdateWithoutUserInput, ScheduleUncheckedUpdateWithoutUserInput>
  }

  export type ScheduleUpdateManyWithWhereWithoutUserInput = {
    where: ScheduleScalarWhereInput
    data: XOR<ScheduleUpdateManyMutationInput, ScheduleUncheckedUpdateManyWithoutUserInput>
  }

  export type ScheduleScalarWhereInput = {
    AND?: ScheduleScalarWhereInput | ScheduleScalarWhereInput[]
    OR?: ScheduleScalarWhereInput[]
    NOT?: ScheduleScalarWhereInput | ScheduleScalarWhereInput[]
    id?: StringFilter<"Schedule"> | string
    userId?: StringFilter<"Schedule"> | string
    title?: StringFilter<"Schedule"> | string
    description?: StringNullableFilter<"Schedule"> | string | null
    date?: DateTimeFilter<"Schedule"> | Date | string
    status?: StringFilter<"Schedule"> | string
    presentationStatus?: StringNullableFilter<"Schedule"> | string | null
    quotationNumber?: StringNullableFilter<"Schedule"> | string | null
    poNumber?: StringNullableFilter<"Schedule"> | string | null
    invoiceNumber?: StringNullableFilter<"Schedule"> | string | null
    notes?: StringNullableFilter<"Schedule"> | string | null
    createdAt?: DateTimeFilter<"Schedule"> | Date | string
    updatedAt?: DateTimeFilter<"Schedule"> | Date | string
    companyId?: StringNullableFilter<"Schedule"> | string | null
  }

  export type TelesaleUpsertWithWhereUniqueWithoutUserInput = {
    where: TelesaleWhereUniqueInput
    update: XOR<TelesaleUpdateWithoutUserInput, TelesaleUncheckedUpdateWithoutUserInput>
    create: XOR<TelesaleCreateWithoutUserInput, TelesaleUncheckedCreateWithoutUserInput>
  }

  export type TelesaleUpdateWithWhereUniqueWithoutUserInput = {
    where: TelesaleWhereUniqueInput
    data: XOR<TelesaleUpdateWithoutUserInput, TelesaleUncheckedUpdateWithoutUserInput>
  }

  export type TelesaleUpdateManyWithWhereWithoutUserInput = {
    where: TelesaleScalarWhereInput
    data: XOR<TelesaleUpdateManyMutationInput, TelesaleUncheckedUpdateManyWithoutUserInput>
  }

  export type TelesaleScalarWhereInput = {
    AND?: TelesaleScalarWhereInput | TelesaleScalarWhereInput[]
    OR?: TelesaleScalarWhereInput[]
    NOT?: TelesaleScalarWhereInput | TelesaleScalarWhereInput[]
    id?: StringFilter<"Telesale"> | string
    companyId?: StringFilter<"Telesale"> | string
    userId?: StringNullableFilter<"Telesale"> | string | null
    conversationSummary?: StringNullableFilter<"Telesale"> | string | null
    needsOrProblems?: StringNullableFilter<"Telesale"> | string | null
    meetingObjective?: StringNullableFilter<"Telesale"> | string | null
    competitorName?: StringNullableFilter<"Telesale"> | string | null
    competitorPrice?: FloatNullableFilter<"Telesale"> | number | null
    competitorPromotion?: StringNullableFilter<"Telesale"> | string | null
    lastMeetingDate?: DateTimeNullableFilter<"Telesale"> | Date | string | null
    result?: StringNullableFilter<"Telesale"> | string | null
    createdAt?: DateTimeFilter<"Telesale"> | Date | string
    updatedAt?: DateTimeFilter<"Telesale"> | Date | string
    callDate?: DateTimeNullableFilter<"Telesale"> | Date | string | null
    callOutcome?: StringNullableFilter<"Telesale"> | string | null
    callStatus?: StringNullableFilter<"Telesale"> | string | null
    forwardTo?: StringNullableFilter<"Telesale"> | string | null
    callbackAt?: DateTimeNullableFilter<"Telesale"> | Date | string | null
  }

  export type EmployeeSaleUpsertWithoutUserInput = {
    update: XOR<EmployeeSaleUpdateWithoutUserInput, EmployeeSaleUncheckedUpdateWithoutUserInput>
    create: XOR<EmployeeSaleCreateWithoutUserInput, EmployeeSaleUncheckedCreateWithoutUserInput>
    where?: EmployeeSaleWhereInput
  }

  export type EmployeeSaleUpdateToOneWithWhereWithoutUserInput = {
    where?: EmployeeSaleWhereInput
    data: XOR<EmployeeSaleUpdateWithoutUserInput, EmployeeSaleUncheckedUpdateWithoutUserInput>
  }

  export type EmployeeSaleUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    branch?: NullableStringFieldUpdateOperationsInput | string | null
    teamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    position?: NullableStringFieldUpdateOperationsInput | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type EmployeeSaleUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    nickname?: NullableStringFieldUpdateOperationsInput | string | null
    branch?: NullableStringFieldUpdateOperationsInput | string | null
    teamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    position?: NullableStringFieldUpdateOperationsInput | string | null
    department?: NullableStringFieldUpdateOperationsInput | string | null
    startDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type MonthlyTargetUpsertWithWhereUniqueWithoutUserInput = {
    where: MonthlyTargetWhereUniqueInput
    update: XOR<MonthlyTargetUpdateWithoutUserInput, MonthlyTargetUncheckedUpdateWithoutUserInput>
    create: XOR<MonthlyTargetCreateWithoutUserInput, MonthlyTargetUncheckedCreateWithoutUserInput>
  }

  export type MonthlyTargetUpdateWithWhereUniqueWithoutUserInput = {
    where: MonthlyTargetWhereUniqueInput
    data: XOR<MonthlyTargetUpdateWithoutUserInput, MonthlyTargetUncheckedUpdateWithoutUserInput>
  }

  export type MonthlyTargetUpdateManyWithWhereWithoutUserInput = {
    where: MonthlyTargetScalarWhereInput
    data: XOR<MonthlyTargetUpdateManyMutationInput, MonthlyTargetUncheckedUpdateManyWithoutUserInput>
  }

  export type MonthlyTargetScalarWhereInput = {
    AND?: MonthlyTargetScalarWhereInput | MonthlyTargetScalarWhereInput[]
    OR?: MonthlyTargetScalarWhereInput[]
    NOT?: MonthlyTargetScalarWhereInput | MonthlyTargetScalarWhereInput[]
    id?: StringFilter<"MonthlyTarget"> | string
    userId?: StringNullableFilter<"MonthlyTarget"> | string | null
    month?: IntFilter<"MonthlyTarget"> | number
    year?: IntFilter<"MonthlyTarget"> | number
    amount?: FloatFilter<"MonthlyTarget"> | number
    createdAt?: DateTimeFilter<"MonthlyTarget"> | Date | string
    updatedAt?: DateTimeFilter<"MonthlyTarget"> | Date | string
  }

  export type CompanyUpsertWithWhereUniqueWithoutAssignedUserInput = {
    where: CompanyWhereUniqueInput
    update: XOR<CompanyUpdateWithoutAssignedUserInput, CompanyUncheckedUpdateWithoutAssignedUserInput>
    create: XOR<CompanyCreateWithoutAssignedUserInput, CompanyUncheckedCreateWithoutAssignedUserInput>
  }

  export type CompanyUpdateWithWhereUniqueWithoutAssignedUserInput = {
    where: CompanyWhereUniqueInput
    data: XOR<CompanyUpdateWithoutAssignedUserInput, CompanyUncheckedUpdateWithoutAssignedUserInput>
  }

  export type CompanyUpdateManyWithWhereWithoutAssignedUserInput = {
    where: CompanyScalarWhereInput
    data: XOR<CompanyUpdateManyMutationInput, CompanyUncheckedUpdateManyWithoutAssignedUserInput>
  }

  export type CompanyScalarWhereInput = {
    AND?: CompanyScalarWhereInput | CompanyScalarWhereInput[]
    OR?: CompanyScalarWhereInput[]
    NOT?: CompanyScalarWhereInput | CompanyScalarWhereInput[]
    id?: StringFilter<"Company"> | string
    companyName?: StringFilter<"Company"> | string
    taxId?: StringNullableFilter<"Company"> | string | null
    address?: StringNullableFilter<"Company"> | string | null
    createdAt?: DateTimeFilter<"Company"> | Date | string
    updatedAt?: DateTimeFilter<"Company"> | Date | string
    area?: StringNullableFilter<"Company"> | string | null
    branchOrHeadOffice?: StringNullableFilter<"Company"> | string | null
    businessType?: StringNullableFilter<"Company"> | string | null
    customerAccessChannel?: StringNullableFilter<"Company"> | string | null
    customerStatus?: StringNullableFilter<"Company"> | string | null
    customerType?: StringNullableFilter<"Company"> | string | null
    district?: StringNullableFilter<"Company"> | string | null
    postalCode?: StringNullableFilter<"Company"> | string | null
    province?: StringNullableFilter<"Company"> | string | null
    subDistrict?: StringNullableFilter<"Company"> | string | null
    assignedUserId?: StringNullableFilter<"Company"> | string | null
  }

  export type UserCreateWithoutMonthlyTargetsInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleCreateNestedManyWithoutUserInput
    telesales?: TelesaleCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleCreateNestedOneWithoutUserInput
    assignedCompanies?: CompanyCreateNestedManyWithoutAssignedUserInput
  }

  export type UserUncheckedCreateWithoutMonthlyTargetsInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationUncheckedCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutUserInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleUncheckedCreateNestedOneWithoutUserInput
    assignedCompanies?: CompanyUncheckedCreateNestedManyWithoutAssignedUserInput
  }

  export type UserCreateOrConnectWithoutMonthlyTargetsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutMonthlyTargetsInput, UserUncheckedCreateWithoutMonthlyTargetsInput>
  }

  export type UserUpsertWithoutMonthlyTargetsInput = {
    update: XOR<UserUpdateWithoutMonthlyTargetsInput, UserUncheckedUpdateWithoutMonthlyTargetsInput>
    create: XOR<UserCreateWithoutMonthlyTargetsInput, UserUncheckedCreateWithoutMonthlyTargetsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutMonthlyTargetsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutMonthlyTargetsInput, UserUncheckedUpdateWithoutMonthlyTargetsInput>
  }

  export type UserUpdateWithoutMonthlyTargetsInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUpdateOneWithoutUserNestedInput
    assignedCompanies?: CompanyUpdateManyWithoutAssignedUserNestedInput
  }

  export type UserUncheckedUpdateWithoutMonthlyTargetsInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUncheckedUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUncheckedUpdateOneWithoutUserNestedInput
    assignedCompanies?: CompanyUncheckedUpdateManyWithoutAssignedUserNestedInput
  }

  export type UserCreateWithoutSchedulesInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationCreateNestedManyWithoutSalespersonInput
    telesales?: TelesaleCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyCreateNestedManyWithoutAssignedUserInput
  }

  export type UserUncheckedCreateWithoutSchedulesInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationUncheckedCreateNestedManyWithoutSalespersonInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleUncheckedCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetUncheckedCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyUncheckedCreateNestedManyWithoutAssignedUserInput
  }

  export type UserCreateOrConnectWithoutSchedulesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSchedulesInput, UserUncheckedCreateWithoutSchedulesInput>
  }

  export type CompanyCreateWithoutSchedulesInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    contacts?: ContactCreateNestedManyWithoutCompanyInput
    quotations?: QuotationCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleCreateNestedManyWithoutCompanyInput
    assignedUser?: UserCreateNestedOneWithoutAssignedCompaniesInput
  }

  export type CompanyUncheckedCreateWithoutSchedulesInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    assignedUserId?: string | null
    contacts?: ContactUncheckedCreateNestedManyWithoutCompanyInput
    quotations?: QuotationUncheckedCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutCompanyInput
  }

  export type CompanyCreateOrConnectWithoutSchedulesInput = {
    where: CompanyWhereUniqueInput
    create: XOR<CompanyCreateWithoutSchedulesInput, CompanyUncheckedCreateWithoutSchedulesInput>
  }

  export type UserUpsertWithoutSchedulesInput = {
    update: XOR<UserUpdateWithoutSchedulesInput, UserUncheckedUpdateWithoutSchedulesInput>
    create: XOR<UserCreateWithoutSchedulesInput, UserUncheckedCreateWithoutSchedulesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSchedulesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSchedulesInput, UserUncheckedUpdateWithoutSchedulesInput>
  }

  export type UserUpdateWithoutSchedulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUpdateManyWithoutSalespersonNestedInput
    telesales?: TelesaleUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUpdateManyWithoutAssignedUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSchedulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUncheckedUpdateManyWithoutSalespersonNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUncheckedUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUncheckedUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUncheckedUpdateManyWithoutAssignedUserNestedInput
  }

  export type CompanyUpsertWithoutSchedulesInput = {
    update: XOR<CompanyUpdateWithoutSchedulesInput, CompanyUncheckedUpdateWithoutSchedulesInput>
    create: XOR<CompanyCreateWithoutSchedulesInput, CompanyUncheckedCreateWithoutSchedulesInput>
    where?: CompanyWhereInput
  }

  export type CompanyUpdateToOneWithWhereWithoutSchedulesInput = {
    where?: CompanyWhereInput
    data: XOR<CompanyUpdateWithoutSchedulesInput, CompanyUncheckedUpdateWithoutSchedulesInput>
  }

  export type CompanyUpdateWithoutSchedulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUpdateManyWithoutCompanyNestedInput
    quotations?: QuotationUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUpdateManyWithoutCompanyNestedInput
    assignedUser?: UserUpdateOneWithoutAssignedCompaniesNestedInput
  }

  export type CompanyUncheckedUpdateWithoutSchedulesInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    assignedUserId?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUncheckedUpdateManyWithoutCompanyNestedInput
    quotations?: QuotationUncheckedUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutCompanyNestedInput
  }

  export type UserCreateWithoutEmployeeSaleInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleCreateNestedManyWithoutUserInput
    telesales?: TelesaleCreateNestedManyWithoutUserInput
    monthlyTargets?: MonthlyTargetCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyCreateNestedManyWithoutAssignedUserInput
  }

  export type UserUncheckedCreateWithoutEmployeeSaleInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationUncheckedCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutUserInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutUserInput
    monthlyTargets?: MonthlyTargetUncheckedCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyUncheckedCreateNestedManyWithoutAssignedUserInput
  }

  export type UserCreateOrConnectWithoutEmployeeSaleInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutEmployeeSaleInput, UserUncheckedCreateWithoutEmployeeSaleInput>
  }

  export type UserUpsertWithoutEmployeeSaleInput = {
    update: XOR<UserUpdateWithoutEmployeeSaleInput, UserUncheckedUpdateWithoutEmployeeSaleInput>
    create: XOR<UserCreateWithoutEmployeeSaleInput, UserUncheckedCreateWithoutEmployeeSaleInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutEmployeeSaleInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutEmployeeSaleInput, UserUncheckedUpdateWithoutEmployeeSaleInput>
  }

  export type UserUpdateWithoutEmployeeSaleInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUpdateManyWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUpdateManyWithoutAssignedUserNestedInput
  }

  export type UserUncheckedUpdateWithoutEmployeeSaleInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUncheckedUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUncheckedUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUncheckedUpdateManyWithoutAssignedUserNestedInput
  }

  export type ContactCreateWithoutCompanyInput = {
    id?: string
    contactName: string
    position?: string | null
    mobilePhone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    quotations?: QuotationCreateNestedManyWithoutContactInput
  }

  export type ContactUncheckedCreateWithoutCompanyInput = {
    id?: string
    contactName: string
    position?: string | null
    mobilePhone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    quotations?: QuotationUncheckedCreateNestedManyWithoutContactInput
  }

  export type ContactCreateOrConnectWithoutCompanyInput = {
    where: ContactWhereUniqueInput
    create: XOR<ContactCreateWithoutCompanyInput, ContactUncheckedCreateWithoutCompanyInput>
  }

  export type ContactCreateManyCompanyInputEnvelope = {
    data: ContactCreateManyCompanyInput | ContactCreateManyCompanyInput[]
    skipDuplicates?: boolean
  }

  export type QuotationCreateWithoutCompanyInput = {
    id?: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    subject?: string | null
    winLossReason?: string | null
    contact?: ContactCreateNestedOneWithoutQuotationsInput
    salesperson?: UserCreateNestedOneWithoutQuotationsInput
  }

  export type QuotationUncheckedCreateWithoutCompanyInput = {
    id?: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    contactId?: string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    salespersonId?: string | null
    subject?: string | null
    winLossReason?: string | null
  }

  export type QuotationCreateOrConnectWithoutCompanyInput = {
    where: QuotationWhereUniqueInput
    create: XOR<QuotationCreateWithoutCompanyInput, QuotationUncheckedCreateWithoutCompanyInput>
  }

  export type QuotationCreateManyCompanyInputEnvelope = {
    data: QuotationCreateManyCompanyInput | QuotationCreateManyCompanyInput[]
    skipDuplicates?: boolean
  }

  export type TelesaleCreateWithoutCompanyInput = {
    id?: string
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
    user?: UserCreateNestedOneWithoutTelesalesInput
  }

  export type TelesaleUncheckedCreateWithoutCompanyInput = {
    id?: string
    userId?: string | null
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
  }

  export type TelesaleCreateOrConnectWithoutCompanyInput = {
    where: TelesaleWhereUniqueInput
    create: XOR<TelesaleCreateWithoutCompanyInput, TelesaleUncheckedCreateWithoutCompanyInput>
  }

  export type TelesaleCreateManyCompanyInputEnvelope = {
    data: TelesaleCreateManyCompanyInput | TelesaleCreateManyCompanyInput[]
    skipDuplicates?: boolean
  }

  export type ScheduleCreateWithoutCompanyInput = {
    id?: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutSchedulesInput
  }

  export type ScheduleUncheckedCreateWithoutCompanyInput = {
    id?: string
    userId: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ScheduleCreateOrConnectWithoutCompanyInput = {
    where: ScheduleWhereUniqueInput
    create: XOR<ScheduleCreateWithoutCompanyInput, ScheduleUncheckedCreateWithoutCompanyInput>
  }

  export type ScheduleCreateManyCompanyInputEnvelope = {
    data: ScheduleCreateManyCompanyInput | ScheduleCreateManyCompanyInput[]
    skipDuplicates?: boolean
  }

  export type UserCreateWithoutAssignedCompaniesInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleCreateNestedManyWithoutUserInput
    telesales?: TelesaleCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAssignedCompaniesInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationUncheckedCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutUserInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleUncheckedCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAssignedCompaniesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAssignedCompaniesInput, UserUncheckedCreateWithoutAssignedCompaniesInput>
  }

  export type ContactUpsertWithWhereUniqueWithoutCompanyInput = {
    where: ContactWhereUniqueInput
    update: XOR<ContactUpdateWithoutCompanyInput, ContactUncheckedUpdateWithoutCompanyInput>
    create: XOR<ContactCreateWithoutCompanyInput, ContactUncheckedCreateWithoutCompanyInput>
  }

  export type ContactUpdateWithWhereUniqueWithoutCompanyInput = {
    where: ContactWhereUniqueInput
    data: XOR<ContactUpdateWithoutCompanyInput, ContactUncheckedUpdateWithoutCompanyInput>
  }

  export type ContactUpdateManyWithWhereWithoutCompanyInput = {
    where: ContactScalarWhereInput
    data: XOR<ContactUpdateManyMutationInput, ContactUncheckedUpdateManyWithoutCompanyInput>
  }

  export type ContactScalarWhereInput = {
    AND?: ContactScalarWhereInput | ContactScalarWhereInput[]
    OR?: ContactScalarWhereInput[]
    NOT?: ContactScalarWhereInput | ContactScalarWhereInput[]
    id?: StringFilter<"Contact"> | string
    companyId?: StringFilter<"Contact"> | string
    contactName?: StringFilter<"Contact"> | string
    position?: StringNullableFilter<"Contact"> | string | null
    mobilePhone?: StringNullableFilter<"Contact"> | string | null
    createdAt?: DateTimeFilter<"Contact"> | Date | string
    updatedAt?: DateTimeFilter<"Contact"> | Date | string
  }

  export type QuotationUpsertWithWhereUniqueWithoutCompanyInput = {
    where: QuotationWhereUniqueInput
    update: XOR<QuotationUpdateWithoutCompanyInput, QuotationUncheckedUpdateWithoutCompanyInput>
    create: XOR<QuotationCreateWithoutCompanyInput, QuotationUncheckedCreateWithoutCompanyInput>
  }

  export type QuotationUpdateWithWhereUniqueWithoutCompanyInput = {
    where: QuotationWhereUniqueInput
    data: XOR<QuotationUpdateWithoutCompanyInput, QuotationUncheckedUpdateWithoutCompanyInput>
  }

  export type QuotationUpdateManyWithWhereWithoutCompanyInput = {
    where: QuotationScalarWhereInput
    data: XOR<QuotationUpdateManyMutationInput, QuotationUncheckedUpdateManyWithoutCompanyInput>
  }

  export type TelesaleUpsertWithWhereUniqueWithoutCompanyInput = {
    where: TelesaleWhereUniqueInput
    update: XOR<TelesaleUpdateWithoutCompanyInput, TelesaleUncheckedUpdateWithoutCompanyInput>
    create: XOR<TelesaleCreateWithoutCompanyInput, TelesaleUncheckedCreateWithoutCompanyInput>
  }

  export type TelesaleUpdateWithWhereUniqueWithoutCompanyInput = {
    where: TelesaleWhereUniqueInput
    data: XOR<TelesaleUpdateWithoutCompanyInput, TelesaleUncheckedUpdateWithoutCompanyInput>
  }

  export type TelesaleUpdateManyWithWhereWithoutCompanyInput = {
    where: TelesaleScalarWhereInput
    data: XOR<TelesaleUpdateManyMutationInput, TelesaleUncheckedUpdateManyWithoutCompanyInput>
  }

  export type ScheduleUpsertWithWhereUniqueWithoutCompanyInput = {
    where: ScheduleWhereUniqueInput
    update: XOR<ScheduleUpdateWithoutCompanyInput, ScheduleUncheckedUpdateWithoutCompanyInput>
    create: XOR<ScheduleCreateWithoutCompanyInput, ScheduleUncheckedCreateWithoutCompanyInput>
  }

  export type ScheduleUpdateWithWhereUniqueWithoutCompanyInput = {
    where: ScheduleWhereUniqueInput
    data: XOR<ScheduleUpdateWithoutCompanyInput, ScheduleUncheckedUpdateWithoutCompanyInput>
  }

  export type ScheduleUpdateManyWithWhereWithoutCompanyInput = {
    where: ScheduleScalarWhereInput
    data: XOR<ScheduleUpdateManyMutationInput, ScheduleUncheckedUpdateManyWithoutCompanyInput>
  }

  export type UserUpsertWithoutAssignedCompaniesInput = {
    update: XOR<UserUpdateWithoutAssignedCompaniesInput, UserUncheckedUpdateWithoutAssignedCompaniesInput>
    create: XOR<UserCreateWithoutAssignedCompaniesInput, UserUncheckedCreateWithoutAssignedCompaniesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAssignedCompaniesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAssignedCompaniesInput, UserUncheckedUpdateWithoutAssignedCompaniesInput>
  }

  export type UserUpdateWithoutAssignedCompaniesInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAssignedCompaniesInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUncheckedUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUncheckedUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUncheckedUpdateManyWithoutUserNestedInput
  }

  export type CompanyCreateWithoutContactsInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    quotations?: QuotationCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleCreateNestedManyWithoutCompanyInput
    assignedUser?: UserCreateNestedOneWithoutAssignedCompaniesInput
  }

  export type CompanyUncheckedCreateWithoutContactsInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    assignedUserId?: string | null
    quotations?: QuotationUncheckedCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutCompanyInput
  }

  export type CompanyCreateOrConnectWithoutContactsInput = {
    where: CompanyWhereUniqueInput
    create: XOR<CompanyCreateWithoutContactsInput, CompanyUncheckedCreateWithoutContactsInput>
  }

  export type QuotationCreateWithoutContactInput = {
    id?: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    subject?: string | null
    winLossReason?: string | null
    company: CompanyCreateNestedOneWithoutQuotationsInput
    salesperson?: UserCreateNestedOneWithoutQuotationsInput
  }

  export type QuotationUncheckedCreateWithoutContactInput = {
    id?: string
    companyId: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    salespersonId?: string | null
    subject?: string | null
    winLossReason?: string | null
  }

  export type QuotationCreateOrConnectWithoutContactInput = {
    where: QuotationWhereUniqueInput
    create: XOR<QuotationCreateWithoutContactInput, QuotationUncheckedCreateWithoutContactInput>
  }

  export type QuotationCreateManyContactInputEnvelope = {
    data: QuotationCreateManyContactInput | QuotationCreateManyContactInput[]
    skipDuplicates?: boolean
  }

  export type CompanyUpsertWithoutContactsInput = {
    update: XOR<CompanyUpdateWithoutContactsInput, CompanyUncheckedUpdateWithoutContactsInput>
    create: XOR<CompanyCreateWithoutContactsInput, CompanyUncheckedCreateWithoutContactsInput>
    where?: CompanyWhereInput
  }

  export type CompanyUpdateToOneWithWhereWithoutContactsInput = {
    where?: CompanyWhereInput
    data: XOR<CompanyUpdateWithoutContactsInput, CompanyUncheckedUpdateWithoutContactsInput>
  }

  export type CompanyUpdateWithoutContactsInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    quotations?: QuotationUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUpdateManyWithoutCompanyNestedInput
    assignedUser?: UserUpdateOneWithoutAssignedCompaniesNestedInput
  }

  export type CompanyUncheckedUpdateWithoutContactsInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    assignedUserId?: NullableStringFieldUpdateOperationsInput | string | null
    quotations?: QuotationUncheckedUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutCompanyNestedInput
  }

  export type QuotationUpsertWithWhereUniqueWithoutContactInput = {
    where: QuotationWhereUniqueInput
    update: XOR<QuotationUpdateWithoutContactInput, QuotationUncheckedUpdateWithoutContactInput>
    create: XOR<QuotationCreateWithoutContactInput, QuotationUncheckedCreateWithoutContactInput>
  }

  export type QuotationUpdateWithWhereUniqueWithoutContactInput = {
    where: QuotationWhereUniqueInput
    data: XOR<QuotationUpdateWithoutContactInput, QuotationUncheckedUpdateWithoutContactInput>
  }

  export type QuotationUpdateManyWithWhereWithoutContactInput = {
    where: QuotationScalarWhereInput
    data: XOR<QuotationUpdateManyMutationInput, QuotationUncheckedUpdateManyWithoutContactInput>
  }

  export type CompanyCreateWithoutQuotationsInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    contacts?: ContactCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleCreateNestedManyWithoutCompanyInput
    assignedUser?: UserCreateNestedOneWithoutAssignedCompaniesInput
  }

  export type CompanyUncheckedCreateWithoutQuotationsInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    assignedUserId?: string | null
    contacts?: ContactUncheckedCreateNestedManyWithoutCompanyInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutCompanyInput
  }

  export type CompanyCreateOrConnectWithoutQuotationsInput = {
    where: CompanyWhereUniqueInput
    create: XOR<CompanyCreateWithoutQuotationsInput, CompanyUncheckedCreateWithoutQuotationsInput>
  }

  export type ContactCreateWithoutQuotationsInput = {
    id?: string
    contactName: string
    position?: string | null
    mobilePhone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    company: CompanyCreateNestedOneWithoutContactsInput
  }

  export type ContactUncheckedCreateWithoutQuotationsInput = {
    id?: string
    companyId: string
    contactName: string
    position?: string | null
    mobilePhone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ContactCreateOrConnectWithoutQuotationsInput = {
    where: ContactWhereUniqueInput
    create: XOR<ContactCreateWithoutQuotationsInput, ContactUncheckedCreateWithoutQuotationsInput>
  }

  export type UserCreateWithoutQuotationsInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    schedules?: ScheduleCreateNestedManyWithoutUserInput
    telesales?: TelesaleCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyCreateNestedManyWithoutAssignedUserInput
  }

  export type UserUncheckedCreateWithoutQuotationsInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    schedules?: ScheduleUncheckedCreateNestedManyWithoutUserInput
    telesales?: TelesaleUncheckedCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleUncheckedCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetUncheckedCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyUncheckedCreateNestedManyWithoutAssignedUserInput
  }

  export type UserCreateOrConnectWithoutQuotationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutQuotationsInput, UserUncheckedCreateWithoutQuotationsInput>
  }

  export type CompanyUpsertWithoutQuotationsInput = {
    update: XOR<CompanyUpdateWithoutQuotationsInput, CompanyUncheckedUpdateWithoutQuotationsInput>
    create: XOR<CompanyCreateWithoutQuotationsInput, CompanyUncheckedCreateWithoutQuotationsInput>
    where?: CompanyWhereInput
  }

  export type CompanyUpdateToOneWithWhereWithoutQuotationsInput = {
    where?: CompanyWhereInput
    data: XOR<CompanyUpdateWithoutQuotationsInput, CompanyUncheckedUpdateWithoutQuotationsInput>
  }

  export type CompanyUpdateWithoutQuotationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUpdateManyWithoutCompanyNestedInput
    assignedUser?: UserUpdateOneWithoutAssignedCompaniesNestedInput
  }

  export type CompanyUncheckedUpdateWithoutQuotationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    assignedUserId?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUncheckedUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutCompanyNestedInput
  }

  export type ContactUpsertWithoutQuotationsInput = {
    update: XOR<ContactUpdateWithoutQuotationsInput, ContactUncheckedUpdateWithoutQuotationsInput>
    create: XOR<ContactCreateWithoutQuotationsInput, ContactUncheckedCreateWithoutQuotationsInput>
    where?: ContactWhereInput
  }

  export type ContactUpdateToOneWithWhereWithoutQuotationsInput = {
    where?: ContactWhereInput
    data: XOR<ContactUpdateWithoutQuotationsInput, ContactUncheckedUpdateWithoutQuotationsInput>
  }

  export type ContactUpdateWithoutQuotationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    company?: CompanyUpdateOneRequiredWithoutContactsNestedInput
  }

  export type ContactUncheckedUpdateWithoutQuotationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUpsertWithoutQuotationsInput = {
    update: XOR<UserUpdateWithoutQuotationsInput, UserUncheckedUpdateWithoutQuotationsInput>
    create: XOR<UserCreateWithoutQuotationsInput, UserUncheckedCreateWithoutQuotationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutQuotationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutQuotationsInput, UserUncheckedUpdateWithoutQuotationsInput>
  }

  export type UserUpdateWithoutQuotationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    schedules?: ScheduleUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUpdateManyWithoutAssignedUserNestedInput
  }

  export type UserUncheckedUpdateWithoutQuotationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    schedules?: ScheduleUncheckedUpdateManyWithoutUserNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUncheckedUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUncheckedUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUncheckedUpdateManyWithoutAssignedUserNestedInput
  }

  export type CompanyCreateWithoutTelesalesInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    contacts?: ContactCreateNestedManyWithoutCompanyInput
    quotations?: QuotationCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleCreateNestedManyWithoutCompanyInput
    assignedUser?: UserCreateNestedOneWithoutAssignedCompaniesInput
  }

  export type CompanyUncheckedCreateWithoutTelesalesInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
    assignedUserId?: string | null
    contacts?: ContactUncheckedCreateNestedManyWithoutCompanyInput
    quotations?: QuotationUncheckedCreateNestedManyWithoutCompanyInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutCompanyInput
  }

  export type CompanyCreateOrConnectWithoutTelesalesInput = {
    where: CompanyWhereUniqueInput
    create: XOR<CompanyCreateWithoutTelesalesInput, CompanyUncheckedCreateWithoutTelesalesInput>
  }

  export type UserCreateWithoutTelesalesInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyCreateNestedManyWithoutAssignedUserInput
  }

  export type UserUncheckedCreateWithoutTelesalesInput = {
    id?: string
    employeeId: string
    email?: string | null
    fullName: string
    phoneNumber?: string | null
    role?: string
    position?: string | null
    password: string
    createdAt?: Date | string
    updatedAt?: Date | string
    otpCode?: string | null
    otpExpiresAt?: Date | string | null
    isActive?: boolean
    quotations?: QuotationUncheckedCreateNestedManyWithoutSalespersonInput
    schedules?: ScheduleUncheckedCreateNestedManyWithoutUserInput
    employeeSale?: EmployeeSaleUncheckedCreateNestedOneWithoutUserInput
    monthlyTargets?: MonthlyTargetUncheckedCreateNestedManyWithoutUserInput
    assignedCompanies?: CompanyUncheckedCreateNestedManyWithoutAssignedUserInput
  }

  export type UserCreateOrConnectWithoutTelesalesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTelesalesInput, UserUncheckedCreateWithoutTelesalesInput>
  }

  export type CompanyUpsertWithoutTelesalesInput = {
    update: XOR<CompanyUpdateWithoutTelesalesInput, CompanyUncheckedUpdateWithoutTelesalesInput>
    create: XOR<CompanyCreateWithoutTelesalesInput, CompanyUncheckedCreateWithoutTelesalesInput>
    where?: CompanyWhereInput
  }

  export type CompanyUpdateToOneWithWhereWithoutTelesalesInput = {
    where?: CompanyWhereInput
    data: XOR<CompanyUpdateWithoutTelesalesInput, CompanyUncheckedUpdateWithoutTelesalesInput>
  }

  export type CompanyUpdateWithoutTelesalesInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUpdateManyWithoutCompanyNestedInput
    quotations?: QuotationUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUpdateManyWithoutCompanyNestedInput
    assignedUser?: UserUpdateOneWithoutAssignedCompaniesNestedInput
  }

  export type CompanyUncheckedUpdateWithoutTelesalesInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    assignedUserId?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUncheckedUpdateManyWithoutCompanyNestedInput
    quotations?: QuotationUncheckedUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutCompanyNestedInput
  }

  export type UserUpsertWithoutTelesalesInput = {
    update: XOR<UserUpdateWithoutTelesalesInput, UserUncheckedUpdateWithoutTelesalesInput>
    create: XOR<UserCreateWithoutTelesalesInput, UserUncheckedCreateWithoutTelesalesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTelesalesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTelesalesInput, UserUncheckedUpdateWithoutTelesalesInput>
  }

  export type UserUpdateWithoutTelesalesInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUpdateManyWithoutAssignedUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTelesalesInput = {
    id?: StringFieldUpdateOperationsInput | string
    employeeId?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    fullName?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    role?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    password?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    otpCode?: NullableStringFieldUpdateOperationsInput | string | null
    otpExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    quotations?: QuotationUncheckedUpdateManyWithoutSalespersonNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutUserNestedInput
    employeeSale?: EmployeeSaleUncheckedUpdateOneWithoutUserNestedInput
    monthlyTargets?: MonthlyTargetUncheckedUpdateManyWithoutUserNestedInput
    assignedCompanies?: CompanyUncheckedUpdateManyWithoutAssignedUserNestedInput
  }

  export type QuotationCreateManySalespersonInput = {
    id?: string
    companyId: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    contactId?: string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    subject?: string | null
    winLossReason?: string | null
  }

  export type ScheduleCreateManyUserInput = {
    id?: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    companyId?: string | null
  }

  export type TelesaleCreateManyUserInput = {
    id?: string
    companyId: string
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
  }

  export type MonthlyTargetCreateManyUserInput = {
    id?: string
    month: number
    year: number
    amount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CompanyCreateManyAssignedUserInput = {
    id?: string
    companyName: string
    taxId?: string | null
    address?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    area?: string | null
    branchOrHeadOffice?: string | null
    businessType?: string | null
    customerAccessChannel?: string | null
    customerStatus?: string | null
    customerType?: string | null
    district?: string | null
    postalCode?: string | null
    province?: string | null
    subDistrict?: string | null
  }

  export type QuotationUpdateWithoutSalespersonInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
    company?: CompanyUpdateOneRequiredWithoutQuotationsNestedInput
    contact?: ContactUpdateOneWithoutQuotationsNestedInput
  }

  export type QuotationUncheckedUpdateWithoutSalespersonInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    contactId?: NullableStringFieldUpdateOperationsInput | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type QuotationUncheckedUpdateManyWithoutSalespersonInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    contactId?: NullableStringFieldUpdateOperationsInput | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ScheduleUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    company?: CompanyUpdateOneWithoutSchedulesNestedInput
  }

  export type ScheduleUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    companyId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ScheduleUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    companyId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TelesaleUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    company?: CompanyUpdateOneRequiredWithoutTelesalesNestedInput
  }

  export type TelesaleUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TelesaleUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type MonthlyTargetUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    month?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    amount?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MonthlyTargetUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    month?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    amount?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MonthlyTargetUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    month?: IntFieldUpdateOperationsInput | number
    year?: IntFieldUpdateOperationsInput | number
    amount?: FloatFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CompanyUpdateWithoutAssignedUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUpdateManyWithoutCompanyNestedInput
    quotations?: QuotationUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUpdateManyWithoutCompanyNestedInput
  }

  export type CompanyUncheckedUpdateWithoutAssignedUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
    contacts?: ContactUncheckedUpdateManyWithoutCompanyNestedInput
    quotations?: QuotationUncheckedUpdateManyWithoutCompanyNestedInput
    telesales?: TelesaleUncheckedUpdateManyWithoutCompanyNestedInput
    schedules?: ScheduleUncheckedUpdateManyWithoutCompanyNestedInput
  }

  export type CompanyUncheckedUpdateManyWithoutAssignedUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    taxId?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    area?: NullableStringFieldUpdateOperationsInput | string | null
    branchOrHeadOffice?: NullableStringFieldUpdateOperationsInput | string | null
    businessType?: NullableStringFieldUpdateOperationsInput | string | null
    customerAccessChannel?: NullableStringFieldUpdateOperationsInput | string | null
    customerStatus?: NullableStringFieldUpdateOperationsInput | string | null
    customerType?: NullableStringFieldUpdateOperationsInput | string | null
    district?: NullableStringFieldUpdateOperationsInput | string | null
    postalCode?: NullableStringFieldUpdateOperationsInput | string | null
    province?: NullableStringFieldUpdateOperationsInput | string | null
    subDistrict?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ContactCreateManyCompanyInput = {
    id?: string
    contactName: string
    position?: string | null
    mobilePhone?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type QuotationCreateManyCompanyInput = {
    id?: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    contactId?: string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    salespersonId?: string | null
    subject?: string | null
    winLossReason?: string | null
  }

  export type TelesaleCreateManyCompanyInput = {
    id?: string
    userId?: string | null
    conversationSummary?: string | null
    needsOrProblems?: string | null
    meetingObjective?: string | null
    competitorName?: string | null
    competitorPrice?: number | null
    competitorPromotion?: string | null
    lastMeetingDate?: Date | string | null
    result?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    callDate?: Date | string | null
    callOutcome?: string | null
    callStatus?: string | null
    forwardTo?: string | null
    callbackAt?: Date | string | null
  }

  export type ScheduleCreateManyCompanyInput = {
    id?: string
    userId: string
    title: string
    description?: string | null
    date: Date | string
    status?: string
    presentationStatus?: string | null
    quotationNumber?: string | null
    poNumber?: string | null
    invoiceNumber?: string | null
    notes?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ContactUpdateWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    quotations?: QuotationUpdateManyWithoutContactNestedInput
  }

  export type ContactUncheckedUpdateWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    quotations?: QuotationUncheckedUpdateManyWithoutContactNestedInput
  }

  export type ContactUncheckedUpdateManyWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    contactName?: StringFieldUpdateOperationsInput | string
    position?: NullableStringFieldUpdateOperationsInput | string | null
    mobilePhone?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type QuotationUpdateWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
    contact?: ContactUpdateOneWithoutQuotationsNestedInput
    salesperson?: UserUpdateOneWithoutQuotationsNestedInput
  }

  export type QuotationUncheckedUpdateWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    contactId?: NullableStringFieldUpdateOperationsInput | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    salespersonId?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type QuotationUncheckedUpdateManyWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    contactId?: NullableStringFieldUpdateOperationsInput | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    salespersonId?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TelesaleUpdateWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneWithoutTelesalesNestedInput
  }

  export type TelesaleUncheckedUpdateWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TelesaleUncheckedUpdateManyWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    conversationSummary?: NullableStringFieldUpdateOperationsInput | string | null
    needsOrProblems?: NullableStringFieldUpdateOperationsInput | string | null
    meetingObjective?: NullableStringFieldUpdateOperationsInput | string | null
    competitorName?: NullableStringFieldUpdateOperationsInput | string | null
    competitorPrice?: NullableFloatFieldUpdateOperationsInput | number | null
    competitorPromotion?: NullableStringFieldUpdateOperationsInput | string | null
    lastMeetingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    result?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    callDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    callOutcome?: NullableStringFieldUpdateOperationsInput | string | null
    callStatus?: NullableStringFieldUpdateOperationsInput | string | null
    forwardTo?: NullableStringFieldUpdateOperationsInput | string | null
    callbackAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ScheduleUpdateWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSchedulesNestedInput
  }

  export type ScheduleUncheckedUpdateWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ScheduleUncheckedUpdateManyWithoutCompanyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: StringFieldUpdateOperationsInput | string
    presentationStatus?: NullableStringFieldUpdateOperationsInput | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poNumber?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    notes?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type QuotationCreateManyContactInput = {
    id?: string
    companyId: string
    status?: string
    salesBeforeVat?: number | null
    transportationFee?: number | null
    installationFee?: number | null
    totalAmountBeforeVat?: number | null
    actualClosingAmount?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    billingDate?: Date | string | null
    followUp1?: Date | string | null
    followUp2?: Date | string | null
    followUp3?: Date | string | null
    followUp4?: Date | string | null
    invoiceNumber?: string | null
    poDate?: Date | string | null
    productType?: string | null
    quotationDate?: Date | string | null
    quotationNumber?: string | null
    rejectReason?: string | null
    remarks?: string | null
    requirementDate?: Date | string | null
    requirementNumber?: string | null
    salesBranch?: string | null
    salesTeamLeader?: string | null
    salespersonId?: string | null
    subject?: string | null
    winLossReason?: string | null
  }

  export type QuotationUpdateWithoutContactInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
    company?: CompanyUpdateOneRequiredWithoutQuotationsNestedInput
    salesperson?: UserUpdateOneWithoutQuotationsNestedInput
  }

  export type QuotationUncheckedUpdateWithoutContactInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    salespersonId?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type QuotationUncheckedUpdateManyWithoutContactInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    salesBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    transportationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    installationFee?: NullableFloatFieldUpdateOperationsInput | number | null
    totalAmountBeforeVat?: NullableFloatFieldUpdateOperationsInput | number | null
    actualClosingAmount?: NullableFloatFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    billingDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp1?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp2?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp3?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    followUp4?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    poDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    productType?: NullableStringFieldUpdateOperationsInput | string | null
    quotationDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    quotationNumber?: NullableStringFieldUpdateOperationsInput | string | null
    rejectReason?: NullableStringFieldUpdateOperationsInput | string | null
    remarks?: NullableStringFieldUpdateOperationsInput | string | null
    requirementDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    requirementNumber?: NullableStringFieldUpdateOperationsInput | string | null
    salesBranch?: NullableStringFieldUpdateOperationsInput | string | null
    salesTeamLeader?: NullableStringFieldUpdateOperationsInput | string | null
    salespersonId?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    winLossReason?: NullableStringFieldUpdateOperationsInput | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}